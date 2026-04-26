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
  OutlineCharacter,
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
    this.uploadRoot = path.resolve(process.cwd(), 'uploads', 'novel-splits');
  }

  /**
   * 接收上传文件并执行拆分（逻辑保持不变）
   */
  async createJobAndSplit(params: {
    novelCode: string;
    chunkSize: number;
    overlap: number;
    sourceFileName: string;
    fileBuffer: Buffer;
  }): Promise<NovelSplitJob> {
    const { novelCode, chunkSize, overlap, sourceFileName, fileBuffer } =
      params;

    const safeNovelCode =
      (novelCode || '').replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 40) ||
      'unknown';
    const jobId = `novel_${safeNovelCode}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    const chunkDir = path.join(this.uploadRoot, jobId);
    await fs.mkdir(chunkDir, { recursive: true });

    const { text: sourceText, encoding: detectedEncoding } =
      this.decodeNovelBuffer(fileBuffer);
    const sourceFilePath = path.join(chunkDir, '__source__.txt');
    await fs.writeFile(sourceFilePath, sourceText, 'utf-8');

    const totalChars = Array.from(sourceText).length;
    const estimated = this.splitter.estimateChunkCount(totalChars, {
      chunkSize,
      overlap,
    });

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

    try {
      const actualTotal = await this.splitter.splitAndWrite(
        sourceText,
        chunkDir,
        { chunkSize, overlap },
        async ({ index }) => {
          await this.jobModel.updateOne(
            { jobId },
            { $set: { splittedChunks: index } },
          );
        },
      );
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
      await this.safeRemoveDir(chunkDir);
      await this.jobModel.updateOne(
        { jobId },
        { $set: { status: 'failed', lastError: (err as Error).message } },
      );
      throw err;
    }
  }

  /**
   * 启动大纲生成
   */
  async startGenerate(jobId: string): Promise<NovelSplitJob> {
    const job = await this.findJobOrThrow(jobId);
    if (job.status === 'splitting')
      throw new BadRequestException('拆分尚未完成');
    if (job.status === 'done') throw new BadRequestException('任务已完成');
    if (this.runningJobs.has(jobId))
      throw new BadRequestException('任务正在运行中');

    await this.jobModel.updateOne(
      { jobId },
      { $set: { status: 'generating', lastError: '' } },
    );
    this.runningJobs.add(jobId);

    const controller = new AbortController();
    this.jobControllers.set(jobId, controller);

    void this.runGenerateLoop(jobId, controller.signal).finally(() => {
      this.runningJobs.delete(jobId);
      this.jobControllers.delete(jobId);
    });

    return (await this.jobModel.findOne({ jobId }).exec())!;
  }

  /**
   * 核心生成循环：采用增量合并策略
   */
  private async runGenerateLoop(
    jobId: string,
    signal: AbortSignal,
  ): Promise<void> {
    this.logger.log(`[gen-loop] 开始生成循环 jobId=${jobId}`);
    try {
      while (true) {
        const job = await this.jobModel.findOne({ jobId }).exec();
        if (!job || job.status !== 'generating') return;

        if (job.processedChunks >= job.totalChunks) {
          await this.jobModel.updateOne(
            { jobId },
            { $set: { status: 'done' } },
          );
          return;
        }

        const nextIndex = job.processedChunks + 1;
        const fileName = `chunk-${String(nextIndex).padStart(4, '0')}.txt`;
        const filePath = path.join(job.chunkDir, fileName);
        const chunkText = await fs.readFile(filePath, 'utf-8');

        // 读取当前大纲
        const existing =
          (await this.outlineModel
            .findOne({ novelCode: job.novelCode })
            .exec()) ?? this.emptyOutline(job.novelCode);

        // 调用大模型获取“增量”
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

        // 校验中止状态
        const afterCall = await this.jobModel.findOne({ jobId }).exec();
        if (!afterCall || afterCall.status !== 'generating') return;

        // --- 执行合并逻辑 ---

        // 1. 剧情大纲追加
        const updatedPlotOutline = existing.plotOutline
          ? `${existing.plotOutline}\n\n${payload.newPlotSegments}`
          : payload.newPlotSegments;

        // 2. 角色列表合并（按名称去重）
        const charMap = new Map<string, OutlineCharacter>();
        (existing.characters || []).forEach((c) => charMap.set(c.name, c));
        (payload.characters || []).forEach((nc) => {
          if (!nc.name) return;
          const oldChar = charMap.get(nc.name) || ({} as OutlineCharacter);
          charMap.set(nc.name, {
            ...oldChar,
            ...nc, // 新提取的属性覆盖旧属性（如更新关系、特征）
          });
        });

        // 保存更新后的完整大纲
        await this.outlineModel.updateOne(
          { novelCode: job.novelCode },
          {
            $set: {
              synopsis: payload.synopsis || existing.synopsis,
              worldSetting: payload.worldSetting || existing.worldSetting,
              plotMainline: payload.plotMainline || existing.plotMainline,
              plotOutline: updatedPlotOutline,
              characters: Array.from(charMap.values()),
              lastJobId: jobId,
              rawLastResponse: raw,
            },
            $setOnInsert: { novelCode: job.novelCode },
          },
          { upsert: true },
        );

        await this.jobModel.updateOne(
          { jobId },
          { $set: { processedChunks: nextIndex } },
        );
      }
    } catch (err) {
      const e = err as Error;
      if (e?.name === 'AbortError' || signal.aborted) return;

      const latest = await this.jobModel.findOne({ jobId }).exec();
      if (latest && latest.status === 'aborted') return;

      this.logger.error(`[gen-loop] 任务失败 jobId=${jobId}: ${e?.stack}`);
      await this.jobModel.updateOne(
        { jobId },
        { $set: { status: 'failed', lastError: e?.message } },
      );
    }
  }

  /**
   * 中止任务（保持不变）
   */
  async abortJob(jobId: string): Promise<void> {
    const job = await this.findJobOrThrow(jobId);
    const controller = this.jobControllers.get(jobId);
    if (controller) {
      controller.abort();
      this.jobControllers.delete(jobId);
    }
    await this.jobModel.updateOne({ jobId }, { $set: { status: 'aborted' } });
    await this.safeRemoveDir(job.chunkDir);
  }

  async getJobStatus(jobId: string): Promise<NovelSplitJob> {
    return this.findJobOrThrow(jobId);
  }
  async getOutline(novelCode: string): Promise<NovelOutline | null> {
    return this.outlineModel.findOne({ novelCode }).exec();
  }
  async listJobs(novelCode: string): Promise<NovelSplitJob[]> {
    return this.jobModel
      .find({ novelCode })
      .sort({ createdAt: -1 })
      .limit(50)
      .exec();
  }

  private async findJobOrThrow(jobId: string): Promise<NovelSplitJobDocument> {
    const job = await this.jobModel.findOne({ jobId }).exec();
    if (!job) throw new NotFoundException(`任务不存在: ${jobId}`);
    return job;
  }

  private async safeRemoveDir(dir: string): Promise<void> {
    try {
      await fs.rm(dir, { recursive: true, force: true });
    } catch {}
  }

  private decodeNovelBuffer(buf: Buffer): { text: string; encoding: string } {
    if (
      buf.length >= 3 &&
      buf[0] === 0xef &&
      buf[1] === 0xbb &&
      buf[2] === 0xbf
    )
      return {
        text: new TextDecoder('utf-8').decode(buf.subarray(3)),
        encoding: 'utf-8 (bom)',
      };
    try {
      return {
        text: new TextDecoder('utf-8', { fatal: true }).decode(buf),
        encoding: 'utf-8',
      };
    } catch {
      try {
        return {
          text: new TextDecoder('gb18030').decode(buf),
          encoding: 'gb18030',
        };
      } catch {
        return {
          text: new TextDecoder('utf-8').decode(buf),
          encoding: 'utf-8 (lossy)',
        };
      }
    }
  }

  private emptyOutline(novelCode: string): NovelOutline {
    return {
      novelCode,
      synopsis: '',
      worldSetting: '',
      plotMainline: '',
      plotOutline: '',
      characters: [],
    } as any;
  }
}
