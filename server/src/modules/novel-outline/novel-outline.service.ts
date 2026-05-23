import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  NovelSplitJob,
  NovelSplitJobDocument,
  NovelSplitJobStatus,
} from './schemas/novel-split-job.schema';
import {
  NovelOutline,
  NovelOutlineDocument,
} from './schemas/novel-outline.schema';
import { SplitterService } from './splitter.service';
import { OpenaiService } from 'src/shared/openai/openai.service';
import { normalize, toStringArray, uniqueStrings } from './outline-merge.utils';
import { OutlineCompressionService } from './outline-compression.service';

/**
 * 小说大纲生成核心服务
 * 负责：任务落库、拆分调度、大纲生成调度、断点续跑、失败清理
 */

interface ExtractParams {
  novelCode: string;

  signal?: AbortSignal;
}

interface SplitJobQueryParams {
  current?: number;
  pageSize?: number;
  novelCode?: string;
  jobId?: string;
  status?: string;
}

interface SplitJobDetailQueryParams {
  jobId?: string;
  novelCode?: string;
}

type ResolvedExtractParams = ExtractParams & {
  jobId: string;
  chunkText: string;
  chunkIndex: number;
  totalChunks: number;
};

type RawWorldView = Record<string, unknown> | string | undefined;

@Injectable()
export class NovelOutlineService {
  // 上传根目录（放在 server/uploads/novel-splits 下）
  private readonly uploadRoot: string;
  private readonly logger = new Logger(NovelOutlineService.name);
  constructor(
    @InjectModel(NovelSplitJob.name)
    private jobModel: Model<NovelSplitJobDocument>,
    @InjectModel(NovelOutline.name)
    private outlineModel: Model<NovelOutlineDocument>,
    private readonly splitter: SplitterService,
    private readonly openaiService: OpenaiService,
    private readonly outlineCompressionService: OutlineCompressionService,
  ) {
    this.uploadRoot = path.resolve(process.cwd(), 'uploads', 'novel-splits');
  }

  /**
   * 接收上传文件并执行拆分
   */
  async createJobAndSplit(params: {
    novelCode: string;
    chunkSize: number;
    overlap: number;
    sourceFileName: string;
    fileBuffer: Buffer;
  }): Promise<NovelSplitJob> {
    console.log('[novel-outline] upload-and-split: 开始创建拆分任务');
    const { novelCode, chunkSize, overlap, sourceFileName, fileBuffer } =
      params;

    const safeNovelCode =
      (novelCode || '').replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 40) ||
      'unknown';
    const jobId = `novel_${safeNovelCode}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    const chunkDir = path.join(this.uploadRoot, safeNovelCode);
    await fs.mkdir(chunkDir, { recursive: true });

    const { text: sourceText, encoding: detectedEncoding } =
      this.decodeNovelBuffer(fileBuffer);
    console.log(
      `[novel-outline] upload-and-split: 文件解码完成 novelCode=${novelCode}, encoding=${detectedEncoding}`,
    );
    const sourceFilePath = path.join(chunkDir, '__source__.txt');
    await fs.writeFile(sourceFilePath, sourceText, 'utf-8');

    const totalChars = Array.from(sourceText).length;
    const estimated = this.splitter.estimateChunkCount(totalChars, {
      chunkSize,
      overlap,
    });

    await this.jobModel.create({
      jobId,
      novelCode,
      sourceFileName,
      totalChars,
      chunkSize,
      overlap,
      chunkDir,
      sourceFilePath,
      totalChunks: estimated,
      status: 'splitting',
    });

    try {
      console.log(
        `[novel-outline] split: 开始拆分 jobId=${jobId}, totalChars=${totalChars}, chunkSize=${chunkSize}, overlap=${overlap}`,
      );
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
      console.log(
        `[novel-outline] split: 拆分完成 jobId=${jobId}, totalChunks=${actualTotal}`,
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
   * 删除文件夹
   */
  private async safeRemoveDir(dir: string): Promise<void> {
    try {
      await fs.rm(dir, { recursive: true, force: true });
    } catch {
      return;
    }
  }

  /**
   * 解码小说文件
   */
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

  /**
   * 根据 novelCode 获取大纲数据
   */
  async findByNovelCode(novelCode: string): Promise<NovelOutline | null> {
    const normalizedNovelCode = novelCode?.trim();
    if (!normalizedNovelCode) {
      throw new BadRequestException('novelCode 不能为空');
    }

    return this.outlineModel.findOne({ novelCode: normalizedNovelCode }).exec();
  }

  async findCompressedByNovelCode(novelCode: string) {
    return this.outlineCompressionService.findByNovelCode(novelCode);
  }

  async buildCompressedByNovelCode(novelCode: string) {
    return this.outlineCompressionService.buildFromNovelCode(novelCode);
  }

  /**
   * 获取 novel_split_jobs 数据
   */
  async findSplitJobs(params: SplitJobQueryParams = {}) {
    const current = Math.max(1, Number(params.current) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 20));
    const filter: Record<string, unknown> = {};

    const novelCode = params.novelCode?.trim();
    if (novelCode) {
      filter.novelCode = novelCode;
    }

    const jobId = params.jobId?.trim();
    if (jobId) {
      filter.jobId = jobId;
    }

    const status = params.status?.trim() as NovelSplitJobStatus | undefined;
    if (status) {
      filter.status = status;
    }

    const [list, total] = await Promise.all([
      this.jobModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((current - 1) * pageSize)
        .limit(pageSize)
        .exec(),
      this.jobModel.countDocuments(filter).exec(),
    ]);

    return {
      list,
      total,
      current,
      pageSize,
    };
  }

  /**
   * 根据 jobId 或 novelCode 获取单个 novel_split_jobs 数据
   */
  async findSplitJob(
    params: SplitJobDetailQueryParams,
  ): Promise<NovelSplitJob | null> {
    const jobId = params.jobId?.trim();
    if (jobId) {
      return this.jobModel.findOne({ jobId }).exec();
    }

    const novelCode = params.novelCode?.trim();
    if (novelCode) {
      return this.jobModel
        .findOne({ novelCode })
        .sort({ createdAt: -1 })
        .exec();
    }

    throw new BadRequestException('jobId 或 novelCode 不能为空');
  }

  /**
   * 启动生成任务
   */
  async startExtract(params: ExtractParams) {
    const novelCode = params.novelCode?.trim();
    const { signal } = params;
    if (!novelCode) {
      throw new BadRequestException('novelCode 不能为空');
    }

    const job = await this.jobModel
      .findOne({
        novelCode,
        chunkDir: { $ne: '' },
        totalChunks: { $gt: 0 },
      })
      .sort({ createdAt: -1 })
      .exec();
    if (!job) {
      throw new NotFoundException(`未找到小说 ${novelCode} 对应的拆分任务`);
    }
    if (job.status === 'splitting') {
      throw new BadRequestException('任务仍在拆分中，暂不能开始提取');
    }

    if (job.status === 'done') {
      return job;
    }

    const totalChunks = job.totalChunks;
    const resumeChunkIndex = Math.max(
      1,
      Math.min(
        totalChunks,
        job.processingChunkIndex || job.lastCompletedChunkIndex + 1 || 1,
      ),
    );
    if (!totalChunks || totalChunks < resumeChunkIndex) {
      throw new BadRequestException('chunkIndex / totalChunks 不合法');
    }
    const jobFilter = { _id: job._id, novelCode };

    try {
      for (
        let chunkIndex = resumeChunkIndex;
        chunkIndex <= totalChunks;
        chunkIndex += 1
      ) {
        if (signal?.aborted) {
          const abortError = new Error('任务已中止');
          abortError.name = 'AbortError';
          throw abortError;
        }

        await this.jobModel.updateOne(jobFilter, {
          $set: {
            status: 'generating',
            processingChunkIndex: chunkIndex,
            totalChunks,
            lastError: '',
          },
        });

        const chunkText = await this.readChunkText(job, chunkIndex);
        if (!chunkText.trim()) {
          throw new BadRequestException('chunkText 不能为空');
        }

        const extractParams: ResolvedExtractParams = {
          ...params,
          novelCode,
          jobId: job.jobId,
          chunkText,
          chunkIndex,
          totalChunks,
        };

        console.log(`准备提取第 ${chunkIndex}/${totalChunks} 个切片...`);
        const result = await this.chunkExtractor(extractParams);
        console.log(`第 ${chunkIndex}/${totalChunks} 个切片提取完成...`);

        await this.mergeChunkResult({
          novelCode,
          jobId: job.jobId,
          chunkIndex,
          result,
        });

        const nextStatus = chunkIndex >= totalChunks ? 'done' : 'generating';
        await this.jobModel.updateOne(jobFilter, {
          $set: {
            status: nextStatus,
            processingChunkIndex:
              nextStatus === 'done' ? totalChunks : chunkIndex + 1,
            lastCompletedChunkIndex: chunkIndex,
            lastError: '',
          },
        });
      }

      try {
        await this.outlineCompressionService.buildFromNovelCode(novelCode);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `compressed 层生成失败，但原始 outline 已完成: novelCode=${novelCode}, error=${message}`,
        );
      }

      return (await this.jobModel.findOne(jobFilter).exec())!;
    } catch (err) {
      const e = err as Error;
      const aborted = e?.name === 'AbortError' || signal?.aborted;
      await this.jobModel.updateOne(jobFilter, {
        $set: {
          status: aborted ? 'aborted' : 'failed',
          lastError: aborted ? '任务已中止' : e.message,
        },
      });
      throw err;
    }
  }

  private async mergeChunkResult(params: {
    novelCode: string;
    jobId: string;
    chunkIndex: number;
    result: Awaited<ReturnType<NovelOutlineService['chunkExtractor']>>;
  }) {
    const { novelCode, jobId, chunkIndex, result } = params;
    const existing =
      (await this.outlineModel.findOne({ novelCode }).exec()) ??
      new this.outlineModel({
        novelCode,
        characters: [],
        events: [],
        worldView: {},
      });

    const characters = [...(existing.characters || [])];
    for (const raw of result.characterResult?.characters || []) {
      const name = normalize(raw?.name);
      if (!name) continue;

      const aliases = uniqueStrings((raw.aliases || []) as unknown[]);
      const aliasCandidates = uniqueStrings(
        (raw.aliasCandidates || []) as unknown[],
      );
      const allNames = new Set([name, ...aliases, ...aliasCandidates]);
      const matched = characters.find((item) =>
        [item.name, ...(item.aliases || []), ...(item.aliasCandidates || [])]
          .filter(Boolean)
          .some((value) => allNames.has(value)),
      );

      if (!matched) {
        characters.push({
          name,
          aliases,
          aliasCandidates,
          identity: toStringArray(raw.identity),
          personality: toStringArray(raw.personality),
          goals: toStringArray(raw.goals),
          traits: toStringArray(raw.traits),
          relations: toStringArray(raw.relations),
        });
        continue;
      }

      matched.aliases = uniqueStrings([...(matched.aliases || []), ...aliases]);
      matched.aliasCandidates = uniqueStrings([
        ...(matched.aliasCandidates || []),
        ...aliasCandidates.filter(
          (candidate) =>
            candidate !== matched.name && !matched.aliases?.includes(candidate),
        ),
      ]);
      matched.identity = uniqueStrings([
        ...toStringArray(matched.identity),
        ...toStringArray(raw.identity),
      ]);
      matched.personality = uniqueStrings([
        ...toStringArray(matched.personality),
        ...toStringArray(raw.personality),
      ]);
      matched.goals = uniqueStrings([
        ...toStringArray(matched.goals),
        ...toStringArray(raw.goals),
      ]);
      matched.traits = uniqueStrings([
        ...toStringArray(matched.traits),
        ...toStringArray(raw.traits),
      ]);
      matched.relations = uniqueStrings([
        ...toStringArray(matched.relations),
        ...toStringArray(raw.relations),
      ]);
    }

    const incomingWorld = this.normalizeWorldResult(result.worldResult);
    const currentWorld = existing.worldView || {};
    const worldView =
      incomingWorld && typeof incomingWorld === 'object'
        ? {
            worldType: uniqueStrings([
              ...toStringArray(currentWorld.worldType),
              ...toStringArray(incomingWorld.worldType),
            ]),
            summary: uniqueStrings([
              ...toStringArray(currentWorld.summary),
              ...toStringArray(incomingWorld.summary),
            ]),
            socialStructure: uniqueStrings([
              ...toStringArray(currentWorld.socialStructure),
              ...toStringArray(incomingWorld.socialStructure),
            ]),
            coreRules: uniqueStrings([
              ...toStringArray(currentWorld.coreRules),
              ...toStringArray(incomingWorld.coreRules),
            ]),
          }
        : currentWorld;

    const currentEvents = (existing.events || []).filter(
      (event) => event.chunkIndex !== chunkIndex,
    );
    const incomingEvents = (result.plotResult?.plotSegments || [])
      .map((item) => ({
        title: normalize(item.title),
        summary: uniqueStrings([
          ...toStringArray(item.summary),
          ...toStringArray(item.impact),
        ]),
        characters: uniqueStrings(item.involvedCharacters || []),
        chunkIndex,
      }))
      .filter((item) => item.title);

    existing.set({
      lastJobId: jobId,
      characters,
      worldView,
      events: [...currentEvents, ...incomingEvents],
    });
    await existing.save();
  }

  private normalizeWorldResult(worldResult: unknown): {
    worldType?: string[];
    summary?: string[];
    socialStructure?: string[];
    coreRules?: string[];
  } | null {
    if (!worldResult || typeof worldResult !== 'object') return null;

    const root = worldResult as Record<string, unknown>;
    const rawWorld = this.pickRawWorldView(root);
    if (!rawWorld) return null;

    if (typeof rawWorld === 'string') {
      const summary = toStringArray(rawWorld);
      return summary.length ? { summary } : null;
    }

    const worldType = uniqueStrings([
      ...toStringArray(rawWorld.worldType),
      ...toStringArray(rawWorld.type),
      ...toStringArray(rawWorld.genre),
    ]);
    const summary = uniqueStrings([
      ...toStringArray(rawWorld.summary),
      ...toStringArray(rawWorld.worldSetting),
      ...toStringArray(rawWorld.setting),
      ...toStringArray(rawWorld.background),
      ...toStringArray(rawWorld.cultivationSystem),
      ...toStringArray(rawWorld.locations),
      ...toStringArray(rawWorld.technologyOrMagic),
    ]);
    const socialStructure = uniqueStrings([
      ...toStringArray(rawWorld.socialStructure),
      ...toStringArray(rawWorld.factions),
      ...toStringArray(rawWorld.organizations),
    ]);
    const coreRules = uniqueStrings([
      ...toStringArray(rawWorld.coreRules),
      ...toStringArray(rawWorld.rules),
    ]);

    if (
      !worldType.length &&
      !summary.length &&
      !socialStructure.length &&
      !coreRules.length
    ) {
      return null;
    }

    return {
      worldType,
      summary,
      socialStructure,
      coreRules,
    };
  }

  private pickRawWorldView(root: Record<string, unknown>): RawWorldView {
    const candidates = [
      root.worldView,
      root.worldview,
      root.world,
      root.worldSetting,
      root.setting,
    ];
    const nested = candidates.find((candidate) => {
      if (typeof candidate === 'string') return normalize(candidate);
      return candidate && typeof candidate === 'object';
    });
    if (nested) return nested as RawWorldView;

    const hasFlatWorldFields = [
      'worldType',
      'summary',
      'socialStructure',
      'coreRules',
      'cultivationSystem',
      'factions',
      'locations',
      'rules',
      'technologyOrMagic',
    ].some((key) => key in root);

    return hasFlatWorldFields ? root : undefined;
  }

  /**
   * 读取块文本
   */
  private async readChunkText(
    job: NovelSplitJobDocument,
    chunkIndex: number,
  ): Promise<string> {
    const chunkFilePath = path.join(
      job.chunkDir,
      `chunk-${String(chunkIndex).padStart(4, '0')}.txt`,
    );

    try {
      return await fs.readFile(chunkFilePath, 'utf-8');
    } catch {
      throw new NotFoundException(`切片文件不存在：${chunkFilePath}`);
    }
  }

  /**
   * 提取（并发执行所有提取任务）
   */
  async chunkExtractor(params: ResolvedExtractParams) {
    this.logger.log(`开始并发提取角色、世界观、剧情...`);

    const [characterResult, worldResult, plotResult] = await Promise.all([
      this.characterExtractor(params),
      this.worldExtractor(params),
      this.plotExtractor(params),
    ]);

    this.logger.log(`第${params.chunkIndex}块切片提取完成`);

    return {
      characterResult,
      worldResult,
      plotResult,
    };
  }

  /**
   * 调用 LLM
   */
  private async callLLM<T>(params: {
    system: string;
    user: string;
    signal?: AbortSignal;
    maxAttempts?: number;
  }): Promise<T> {
    const maxAttempts = params.maxAttempts ?? 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const completion =
          await this.openaiService.client.chat.completions.create(
            {
              model: this.openaiService.model,
              messages: [
                { role: 'system', content: params.system },
                { role: 'user', content: params.user },
              ],
              response_format: { type: 'json_object' as const },
              temperature: 0.3,
              max_tokens: 12000,
            },
            { signal: params.signal },
          );

        const raw = completion.choices?.[0]?.message?.content?.trim() ?? '';
        if (!raw) {
          throw new Error('返回内容为空');
        }
        return JSON.parse(raw) as T;
      } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e));
        if (error.name === 'AbortError' || params.signal?.aborted) {
          throw error;
        }

        lastError = error;
        if (attempt >= maxAttempts) break;

        this.logger.warn(
          `LLM调用失败，第 ${attempt}/${maxAttempts} 次，将重试：${error.message}`,
        );
        await this.sleep(600 * attempt, params.signal);
      }
    }

    throw new Error(
      `LLM调用失败，已尝试 ${maxAttempts} 次: ${lastError?.message ?? '未知错误'}`,
    );
  }

  private async sleep(ms: number, signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) {
      const abortError = new Error('任务已中止');
      abortError.name = 'AbortError';
      throw abortError;
    }

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, ms);
      signal?.addEventListener(
        'abort',
        () => {
          clearTimeout(timer);
          const abortError = new Error('任务已中止');
          abortError.name = 'AbortError';
          reject(abortError);
        },
        { once: true },
      );
    });
  }

  /**
   * 角色提取器
   */
  async characterExtractor(params: ResolvedExtractParams) {
    this.logger.log(`正在提取角色...`);
    const { chunkText, chunkIndex, totalChunks, novelCode, signal } = params;

    const system = `
你是小说信息抽取器，只负责【人物信息提取】。

严格规则：
- 只能提取人物相关内容
- 禁止总结剧情、世界观
- 禁止输出无关解释
- 输出必须是合法 JSON
- 字段不能为空可省略

人物合并规则：
- 同名/别名视为同一人候选
- 不确定的名字放 aliasCandidates

输出格式必须严格如下：
{
  "characters": [
    {
      "name": "主名称",
      "aliases": ["别名1", "别名2"],
      "aliasCandidates": ["疑似别名"],
      "identity": ["身份/背景"],
      "personality": ["性格"],
      "goals": ["目标"],
      "traits": ["特征"],
      "relations": ["关系"]
    }
  ]
}
`;

    const user = `
小说编号：${novelCode}
当前chunk：${chunkIndex}/${totalChunks}

文本：
${chunkText}
`;

    const res = await this.callLLM<{
      characters: any[];
    }>({ system, user, signal });

    this.logger.log(`角色提取结束`);

    return res;
  }

  /**
   * 世界观提取器
   */
  async worldExtractor(params: ResolvedExtractParams) {
    this.logger.log(`正在提取世界观...`);
    const { chunkText, chunkIndex, totalChunks, novelCode, signal } = params;

    const system = `
你是小说世界观抽取器，只负责提取【世界设定】。

严格规则：
- 只提取本段正文中新增或明确出现的世界设定
- 世界设定包括：世界类型、时代/社会背景、组织势力、地点、能力体系、技术/魔法/规则、阶层制度
- 禁止提取人物小传与剧情事件，但可以提取由剧情透露出的设定
- 如果没有明确世界设定，对应字段输出空数组
- 输出必须是合法 JSON，不要输出解释文字

输出格式：

{
  "worldView": {
    "worldType": ["世界类型，如修仙/都市/科幻/西幻；无法判断则为空数组"],
    "summary": ["世界背景、地点、能力体系、技术或魔法设定"],
    "socialStructure": ["组织势力、阶层制度、社会关系结构"],
    "coreRules": ["世界运行规则、限制、能力规则"]
  }
}
`;

    const user = `
小说编号：${novelCode}
当前chunk：${chunkIndex}/${totalChunks}

文本：
${chunkText}
`;

    const res = await this.callLLM<{
      worldView?: {
        worldType?: string[];
        summary?: string[];
        socialStructure?: string[];
        coreRules?: string[];
      };
      worldview?: {
        cultivationSystem?: string[];
        factions?: string[];
        locations?: string[];
        rules?: string[];
        technologyOrMagic?: string[];
      };
    }>({ system, user, signal });

    this.logger.log(`世界观提取结束`);

    return res;
  }

  /**
   * 剧情提取器
   */
  async plotExtractor(params: ResolvedExtractParams) {
    this.logger.log(`正在提取剧情...`);
    const { chunkText, chunkIndex, totalChunks, novelCode, signal } = params;

    const system = `
你是小说剧情抽取器，只负责提取【事件与剧情发展】。

严格规则：
- 只能输出剧情事件
- 不要总结，不要评价
- 必须按时间顺序
- 输出必须是 JSON

输出格式：

{
  "plotSegments": [
    {
      "title": "事件标题",
      "summary": ["发生了什么"],
      "involvedCharacters": ["人物1", "人物2"],
      "impact": "对后续影响"
    }
  ]
}
`;

    const user = `
小说编号：${novelCode}
当前chunk：${chunkIndex}/${totalChunks}

文本：
${chunkText}
`;

    const res = await this.callLLM<{
      plotSegments: Array<{
        title: string;
        summary: string[];
        involvedCharacters: string[];
        impact: string;
      }>;
    }>({ system, user, signal });
    this.logger.log(`剧情提取结束`);
    return res;
  }
}
