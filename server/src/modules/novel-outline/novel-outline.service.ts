import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  NovelSplitJob,
  NovelSplitJobDocument,
} from './schemas/novel-split-job.schema';
import {
  NovelOutline,
  NovelOutlineDocument,
} from './schemas/novel-outline.schema';
import { SplitterService } from './splitter.service';
import { OutlineGeneratorService } from './outline-generator.service';

/**
 * 小说大纲生成核心服务
 * 负责：任务落库、拆分调度、大纲生成调度、断点续跑、失败清理
 */
@Injectable()
export class NovelOutlineService {
  private readonly logger = new Logger(NovelOutlineService.name);

  // 上传根目录（放在 server/uploads/novel-splits 下）
  private readonly uploadRoot: string;

  // 进程内正在跑的生成任务 jobId 集合，防止重复启动
  private readonly runningJobs = new Set<string>();

  // 每个正在生成的任务对应的 AbortController，用于在用户点击"中止"时立即 cancel 底层 LLM 请求
  private readonly jobControllers = new Map<string, AbortController>();

  constructor(
    @InjectModel(NovelSplitJob.name)
    private jobModel: Model<NovelSplitJobDocument>,
    @InjectModel(NovelOutline.name)
    private outlineModel: Model<NovelOutlineDocument>,
    private readonly splitter: SplitterService,
    private readonly generator: OutlineGeneratorService,
  ) {
    // server 进程工作目录下的 uploads/novel-splits
    this.uploadRoot = path.resolve(process.cwd(), 'uploads', 'novel-splits');
  }

  /**
   * 接收上传文件 + 业务参数 → 落盘、建任务、同步执行拆分
   * 拆分完成后状态转为 split_done；中途失败则回滚删除目录并抛错
   */
  async createJobAndSplit(params: {
    novelCode: string;
    chunkSize: number;
    overlap: number;
    sourceFileName: string;
    fileBuffer: Buffer;
  }): Promise<NovelSplitJob> {
    const { novelCode, chunkSize, overlap, sourceFileName, fileBuffer } = params;

    // 生成 jobId & 目录：把 novelCode 编入目录名，便于按小说归档查找
    // novelCode 做一次文件系统安全化：只保留字母/数字/下划线/短横线
    const safeNovelCode =
      (novelCode || '').replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 40) ||
      'unknown';
    const jobId = `novel_${safeNovelCode}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    const chunkDir = path.join(this.uploadRoot, jobId);
    await fs.mkdir(chunkDir, { recursive: true });

    // 自动识别原文编码（UTF-8 / UTF-16 / GBK(GB18030) 等），统一解码为 JS 字符串
    const { text: sourceText, encoding: detectedEncoding } =
      this.decodeNovelBuffer(fileBuffer);
    this.logger.log(
      `原文解码完成 jobId=${jobId} encoding=${detectedEncoding} chars=${sourceText.length}`,
    );

    // 原文持久化到目录内（统一以 UTF-8 落盘，便于日后重跑 & 后续 chunk 统一编码）
    const sourceFilePath = path.join(chunkDir, '__source__.txt');
    await fs.writeFile(sourceFilePath, sourceText, 'utf-8');

    const totalChars = Array.from(sourceText).length;
    const estimated = this.splitter.estimateChunkCount(totalChars, {
      chunkSize,
      overlap,
    });

    // 先建任务（状态 splitting）
    const job = await this.jobModel.create({
      jobId,
      novelCode,
      sourceFileName,
      totalChars,
      chunkSize,
      overlap,
      chunkDir,
      sourceFilePath,
      totalChunks: estimated,
      splittedChunks: 0,
      processedChunks: 0,
      status: 'splitting',
    });

    // 开始拆分（同步执行，拆分本身耗时可控）
    try {
      const actualTotal = await this.splitter.splitAndWrite(
        sourceText,
        chunkDir,
        { chunkSize, overlap },
        async ({ index }) => {
          // 每写一个 chunk 文件都更新进度，保证断电也能看到最新状态
          await this.jobModel.updateOne(
            { jobId },
            { $set: { splittedChunks: index } },
          );
        },
      );

      // 拆分成功：把真实总数回写，状态置为 split_done
      await this.jobModel.updateOne(
        { jobId },
        {
          $set: {
            totalChunks: actualTotal,
            splittedChunks: actualTotal,
            status: 'split_done',
          },
        },
      );

      return (await this.jobModel.findOne({ jobId }).exec())!;
    } catch (err) {
      // 简单方案：失败即清理已生成文件，把任务置 failed
      this.logger.error(`拆分失败 jobId=${jobId}: ${(err as Error).message}`);
      await this.safeRemoveDir(chunkDir);
      await this.jobModel.updateOne(
        { jobId },
        {
          $set: { status: 'failed', lastError: (err as Error).message },
        },
      );
      throw err;
    }
  }

  /**
   * 启动（或续跑）大纲生成
   * 接口立即返回 job 快照，真正的逐块处理在后台 Promise 中进行，前端通过 job-status 轮询
   */
  async startGenerate(jobId: string): Promise<NovelSplitJob> {
    const job = await this.findJobOrThrow(jobId);

    if (job.status === 'splitting') {
      throw new BadRequestException('拆分尚未完成，无法开始生成');
    }
    if (job.status === 'done') {
      throw new BadRequestException('任务已经完成，无需重复生成');
    }
    if (this.runningJobs.has(jobId)) {
      throw new BadRequestException('任务正在生成中');
    }

    // 先把状态置为 generating
    await this.jobModel.updateOne(
      { jobId },
      { $set: { status: 'generating', lastError: '' } },
    );
    this.runningJobs.add(jobId);

    // 为本次运行创建 AbortController，abortJob 时会调用 .abort() 立即中断 LLM 请求
    const controller = new AbortController();
    this.jobControllers.set(jobId, controller);

    // 异步执行（Promise 脱离主链路），错误在内部捕获并写库
    void this.runGenerateLoop(jobId, controller.signal).finally(() => {
      this.runningJobs.delete(jobId);
      this.jobControllers.delete(jobId);
    });

    return (await this.jobModel.findOne({ jobId }).exec())!;
  }

  /**
   * 后台生成循环：从 processedChunks 继续，逐块请求大模型并更新大纲
   * 关键要求（来自需求）：每次都带上"已知大纲 + 新片段"
   * 中止策略：
   *   1. 每轮开头检查一次 status（避免状态突变后进入下一块）
   *   2. 调 LLM 时透传 AbortSignal，abortJob 触发后立即 cancel 网络请求
   *   3. LLM 返回后再校验一次 status，防止极端时序下结果污染大纲
   */
  private async runGenerateLoop(
    jobId: string,
    signal: AbortSignal,
  ): Promise<void> {
    this.logger.log(`[gen-loop] 开始生成循环 jobId=${jobId}`);
    try {
      // 每轮都重新读任务，以便响应外部 abort
      let job = await this.findJobOrThrow(jobId);

      while (true) {
        // 中途被中止 / 被删除 → 终止
        const latest = await this.jobModel.findOne({ jobId }).exec();
        if (!latest || latest.status !== 'generating') {
          this.logger.warn(
            `[gen-loop] 退出循环（状态变更）jobId=${jobId} status=${latest?.status ?? 'missing'} processed=${latest?.processedChunks ?? '?'}/${latest?.totalChunks ?? '?'}`,
          );
          return;
        }
        job = latest;

        if (job.processedChunks >= job.totalChunks) {
          // 全部处理完
          await this.jobModel.updateOne(
            { jobId },
            { $set: { status: 'done' } },
          );
          this.logger.log(
            `[gen-loop] 任务完成 jobId=${jobId} total=${job.totalChunks}`,
          );
          return;
        }

        // 读下一块（processedChunks 从 0 开始，索引+1 即下一块）
        const nextIndex = job.processedChunks + 1;
        const fileName = `chunk-${String(nextIndex).padStart(4, '0')}.txt`;
        const filePath = path.join(job.chunkDir, fileName);
        const chunkText = await fs.readFile(filePath, 'utf-8');

        // 读取当前大纲快照
        const existing =
          (await this.outlineModel.findOne({ novelCode: job.novelCode }).exec()) ??
          this.emptyOutline(job.novelCode);

        // 调大模型：已知大纲 + 新片段
        this.logger.log(
          `[gen-loop] → 调用大模型 jobId=${jobId} chunk=${nextIndex}/${job.totalChunks} chunkChars=${chunkText.length}`,
        );
        const llmStart = Date.now();
        const { payload, raw } = await this.generator.updateOutlineWithChunk(
          {
            synopsis: existing.synopsis,
            worldSetting: existing.worldSetting,
            plotMainline: existing.plotMainline,
            plotOutline: existing.plotOutline,
            characters: existing.characters,
          },
          nextIndex,
          job.totalChunks,
          chunkText,
          signal,
        );
        const llmCost = Date.now() - llmStart;
        this.logger.log(
          `[gen-loop] ← 大模型返回 jobId=${jobId} chunk=${nextIndex}/${job.totalChunks} cost=${llmCost}ms rawLen=${raw?.length ?? 0}`,
        );

        // 大模型返回后再校验一次：如果此时已被中止，本轮结果直接丢弃，避免污染大纲
        const afterCall = await this.jobModel.findOne({ jobId }).exec();
        if (!afterCall || afterCall.status !== 'generating') {
          this.logger.warn(
            `[gen-loop] 大模型返回后检测到中止，丢弃本轮结果 jobId=${jobId} chunk=${nextIndex} status=${afterCall?.status ?? 'missing'}`,
          );
          return;
        }

        // upsert 大纲
        await this.outlineModel.updateOne(
          { novelCode: job.novelCode },
          {
            $set: {
              ...payload,
              lastJobId: jobId,
              rawLastResponse: raw,
            },
            $setOnInsert: { novelCode: job.novelCode },
          },
          { upsert: true },
        );

        // 更新进度
        await this.jobModel.updateOne(
          { jobId },
          { $set: { processedChunks: nextIndex } },
        );
        this.logger.log(
          `[gen-loop] ✓ 进度更新 jobId=${jobId} processed=${nextIndex}/${job.totalChunks}`,
        );
      }
    } catch (err) {
      const e = err as Error;
      // 1) AbortError：用户点了中止，signal 让 LLM/fetch 从 await 中立刻抛出。正常语义，不算失败
      const isAbortError =
        e?.name === 'AbortError' ||
        signal.aborted ||
        /aborted/i.test(e?.message || '');
      if (isAbortError) {
        this.logger.warn(
          `[gen-loop] LLM 请求被中止（AbortController）jobId=${jobId} msg=${e?.message}`,
        );
        return;
      }
      // 2) 竞态保护：如果此刻 status 已经是 aborted（用户在 IO 期间点了中止导致的 ENOENT 等），
      //    不要再把它覆盖为 failed——那样会误报给前端"失败了"
      const latest = await this.jobModel.findOne({ jobId }).exec();
      if (latest && latest.status === 'aborted') {
        this.logger.warn(
          `[gen-loop] 捕获到异常但任务已被中止，跳过 failed 覆盖 jobId=${jobId} err=${e?.message}`,
        );
        return;
      }
      this.logger.error(`[gen-loop] 任务失败 jobId=${jobId}: ${e?.stack}`);
      await this.jobModel.updateOne(
        { jobId },
        {
          $set: { status: 'failed', lastError: e?.message },
        },
      );
    }
  }

  /**
   * 中止任务并清理切片目录
   * 立即中止策略：
   *   1. 通过 AbortController.abort() 让正在飞的 LLM HTTP 请求从网络层断开（不再等它返回）
   *   2. 把 DB 状态置为 aborted（双保险：即便 controller 已经被清掉，循环下一轮检查也会退出）
   *   3. 清理切片目录
   */
  async abortJob(jobId: string): Promise<void> {
    const job = await this.findJobOrThrow(jobId);
    const controller = this.jobControllers.get(jobId);
    const hasController = !!controller;
    this.logger.warn(
      `[abort] 收到中止请求 jobId=${jobId} novelCode=${job.novelCode} currentStatus=${job.status} processed=${job.processedChunks}/${job.totalChunks} hasController=${hasController}`,
    );

    // 先触发 abort：尽早让底层 fetch 抛 AbortError，循环会立刻从 await 里跳出
    if (controller) {
      try {
        controller.abort();
        this.logger.warn(
          `[abort] 已触发 AbortController.abort() jobId=${jobId}，当前飞行中的 LLM 请求将被取消`,
        );
      } catch (e) {
        this.logger.error(
          `[abort] 触发 abort 时异常 jobId=${jobId}: ${(e as Error).message}`,
        );
      }
      // 主动从 map 中删除，避免后续重复 abort
      this.jobControllers.delete(jobId);
    }

    await this.jobModel.updateOne(
      { jobId },
      { $set: { status: 'aborted' } },
    );
    await this.safeRemoveDir(job.chunkDir);
    const isRunning = this.runningJobs.has(jobId);
    this.logger.warn(
      `[abort] 已置为 aborted 并清理目录 jobId=${jobId} dir=${job.chunkDir} inRunningJobs=${isRunning}`,
    );
  }

  /**
   * 查询任务状态
   */
  async getJobStatus(jobId: string): Promise<NovelSplitJob> {
    return this.findJobOrThrow(jobId);
  }

  /**
   * 查询小说大纲
   */
  async getOutline(novelCode: string): Promise<NovelOutline | null> {
    return this.outlineModel.findOne({ novelCode }).exec();
  }

  /**
   * 按 novelCode 查任务列表（倒序）
   */
  async listJobs(novelCode: string): Promise<NovelSplitJob[]> {
    return this.jobModel
      .find({ novelCode })
      .sort({ createdAt: -1 })
      .limit(50)
      .exec();
  }

  /**
   * 根据 jobId 查任务，不存在抛 404
   */
  private async findJobOrThrow(jobId: string): Promise<NovelSplitJobDocument> {
    const job = await this.jobModel.findOne({ jobId }).exec();
    if (!job) throw new NotFoundException(`任务不存在: ${jobId}`);
    return job;
  }

  /**
   * 删除目录（不存在时忽略错误）
   */
  private async safeRemoveDir(dir: string): Promise<void> {
    try {
      await fs.rm(dir, { recursive: true, force: true });
    } catch (err) {
      this.logger.warn(`清理目录失败 ${dir}: ${(err as Error).message}`);
    }
  }

  /**
   * 自动识别小说 txt 原文编码并解码成 JS 字符串
   * 识别顺序：
   * 1. UTF-8 / UTF-16LE / UTF-16BE BOM：直接按对应编码解码
   * 2. 无 BOM 时，先严格模式尝试 UTF-8（fatal=true），合法则视为 UTF-8
   * 3. UTF-8 严格解码失败，说明是 GBK 系国标编码，退回 gb18030（GBK 的超集）
   * 说明：Node.js 内置 ICU 支持 gb18030，无需引入 iconv-lite 等额外依赖
   */
  private decodeNovelBuffer(buf: Buffer): { text: string; encoding: string } {
    // 1) 优先基于 BOM 判断
    if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
      return {
        text: new TextDecoder('utf-8').decode(buf.subarray(3)),
        encoding: 'utf-8 (bom)',
      };
    }
    if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
      return {
        text: new TextDecoder('utf-16le').decode(buf.subarray(2)),
        encoding: 'utf-16le',
      };
    }
    if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
      return {
        text: new TextDecoder('utf-16be').decode(buf.subarray(2)),
        encoding: 'utf-16be',
      };
    }

    // 2) 无 BOM：严格模式尝试 UTF-8，失败则视为非 UTF-8
    try {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(buf);
      return { text, encoding: 'utf-8' };
    } catch {
      // 3) 回退到 GB18030（兼容 GBK / GB2312）
      try {
        const text = new TextDecoder('gb18030').decode(buf);
        return { text, encoding: 'gb18030' };
      } catch (err) {
        // gb18030 解码还失败的话，最后再宽松地按 UTF-8（非 fatal）兜底，避免整体崩溃
        this.logger.warn(
          `gb18030 解码失败，回退到宽松 UTF-8: ${(err as Error).message}`,
        );
        return {
          text: new TextDecoder('utf-8').decode(buf),
          encoding: 'utf-8 (lossy)',
        };
      }
    }
  }

  /**
   * 返回一个空大纲对象（类型仅覆盖本模块使用的字段）
   */
  private emptyOutline(
    novelCode: string,
  ): Pick<
    NovelOutline,
    | 'novelCode'
    | 'synopsis'
    | 'worldSetting'
    | 'plotMainline'
    | 'plotOutline'
    | 'characters'
  > {
    return {
      novelCode,
      synopsis: '',
      worldSetting: '',
      plotMainline: '',
      plotOutline: '',
      characters: [],
    };
  }
}
