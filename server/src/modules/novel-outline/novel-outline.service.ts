import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
import { NovelMeta, NovelMetaDocument } from './schemas/novel-meta.schema';
import { SplitterService } from './splitter.service';
import { OpenaiService } from 'src/shared/openai/openai.service';
import { normalize, toStringArray, uniqueStrings } from './outline-merge.utils';

/**
 * 小说大纲生成核心服务
 * 负责：任务落库、拆分调度、大纲生成调度、断点续跑、失败清理
 */

interface ExtractParams {
  jobId: string;
  signal?: AbortSignal;
}

interface SplitJobQueryParams {
  current?: number;
  pageSize?: number;
  novelCode?: string;
  jobId?: string;
  status?: string;
}

type ResolvedExtractParams = ExtractParams & {
  novelCode: string;
  chunkText: string;
  chunkIndex: number;
  totalChunks: number;
};

type RawWorldView = Record<string, unknown> | string | undefined;

export interface ChunkMeta {
  chunkId: string;
  summary: string;
  keywords: string[];
  characters: string[];
  locations: string[];
  organizations: string[];
  concepts: string[];
  events: string[];
}

interface SearchChunkMetaParams {
  novelCode: string;
  query: string;
  topN?: number;
  includeChunks?: boolean;
}

export interface SearchChunkMetaHit {
  id: string;
  score: number;
  summary: string;
  keywords: string[];
  characters: string[];
  locations: string[];
  organizations: string[];
  concepts: string[];
  events: string[];
  chunkFilePath: string;
  chunkText?: string;
}

interface ChunkFileEntry {
  chunkId: string;
  filePath: string;
}

@Injectable()
export class NovelOutlineService {
  // 上传根目录（放在 server/uploads/novel-splits 下）
  private readonly uploadRoot: string;
  private readonly logger = new Logger(NovelOutlineService.name);
  private readonly runningJobs = new Map<string, AbortController>();
  private readonly chunkMetaMaxAttempts: number;
  constructor(
    @InjectModel(NovelSplitJob.name)
    private jobModel: Model<NovelSplitJobDocument>,
    @InjectModel(NovelOutline.name)
    private outlineModel: Model<NovelOutlineDocument>,
    @InjectModel(NovelMeta.name)
    private novelMetaModel: Model<NovelMetaDocument>,
    private readonly splitter: SplitterService,
    private readonly openaiService: OpenaiService,
    private readonly configService: ConfigService,
  ) {
    this.uploadRoot = path.resolve(process.cwd(), 'uploads', 'novel-splits');
    this.chunkMetaMaxAttempts = Math.max(
      1,
      Number(this.configService.get<string>('NOVEL_CHUNK_META_MAX_ATTEMPTS')) ||
        3,
    );
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
    const novelDir = path.join(this.uploadRoot, safeNovelCode);
    const chunkDir = path.join(novelDir, 'chunks');
    await this.safeRemoveDir(chunkDir);
    await fs.mkdir(chunkDir, { recursive: true });

    const { text: sourceText, encoding: detectedEncoding } =
      this.decodeNovelBuffer(fileBuffer);
    console.log(
      `[novel-outline] upload-and-split: 文件解码完成 novelCode=${novelCode}, encoding=${detectedEncoding}`,
    );
    const sourceFilePath = path.join(novelDir, '__source__.txt');
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
      metaDir: '',
      sourceFilePath,
      totalChunks: estimated,
      splittedChunks: 0,
      metaGeneratedChunks: 0,
      processedChunks: 0,
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
            status: 'meta_generating',
          },
        },
      );
      await this.rebuildNovelMetaIndexForChunks(jobId, {
        chunkDir,
        novelCode,
        totalChunks: actualTotal,
        resetExisting: true,
      });
      await this.jobModel.updateOne(
        { jobId },
        {
          $set: {
            totalChunks: actualTotal,
            splittedChunks: actualTotal,
            metaGeneratedChunks: actualTotal,
            status: 'split_done',
            lastError: '',
          },
        },
      );
      console.log(
        `[novel-outline] split/index: 导入完成 jobId=${jobId}, totalChunks=${actualTotal}`,
      );
      return (await this.jobModel.findOne({ jobId }).exec())!;
    } catch (err) {
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

  async searchChunkMeta(params: SearchChunkMetaParams) {
    const novelCode = params.novelCode?.trim();
    const query = params.query?.trim();
    const topN = Math.min(20, Math.max(1, Number(params.topN) || 5));
    if (!novelCode) {
      throw new BadRequestException('novelCode 不能为空');
    }
    if (!query) {
      throw new BadRequestException('query 不能为空');
    }

    const queryWords = this.tokenizeQuery(query);
    const hits = await this.loadAndScoreChunkMetas({
      novelCode,
      queryWords,
      topN,
      includeChunks: params.includeChunks,
    });

    return {
      novelCode,
      query,
      queryWords,
      total: hits.length,
      hits,
    };
  }

  async answerQuestionByMeta(params: {
    novelCode: string;
    question: string;
    topN?: number;
  }) {
    const question = params.question?.trim();
    if (!question) {
      throw new BadRequestException('question 不能为空');
    }

    const retrieval = await this.searchChunkMeta({
      novelCode: params.novelCode,
      query: question,
      topN: params.topN,
      includeChunks: true,
    });

    const prompt = this.buildNovelQaContextPrompt(
      retrieval.hits.map((hit, index) => ({
        index: index + 1,
        id: hit.id,
        summary: hit.summary,
        keywords: hit.keywords,
        characters: hit.characters,
        locations: hit.locations,
        organizations: hit.organizations,
        concepts: hit.concepts,
        events: hit.events,
        chunkText: hit.chunkText || '',
      })),
    );

    const completion = await this.openaiService.client.chat.completions.create({
      model: this.openaiService.model,
      messages: [
        {
          role: 'system',
          content: [
            '你是小说百科助手。',
            '你只能依据提供的资料回答，不允许编造。',
            '如果资料不足，必须明确说明“根据当前提供的资料，暂时无法确定”。',
            '回答风格使用简洁、准确的百科风格。',
          ].join('\n'),
        },
        {
          role: 'system',
          content: prompt,
        },
        {
          role: 'user',
          content: question,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const answer = completion.choices?.[0]?.message?.content?.trim() ?? '';
    return {
      novelCode: params.novelCode,
      question,
      queryWords: retrieval.queryWords,
      hits: retrieval.hits,
      answer,
    };
  }

  async buildNovelQuestionContext(params: {
    novelCode: string;
    question: string;
    topN?: number;
  }) {
    const retrieval = await this.searchChunkMeta({
      novelCode: params.novelCode,
      query: params.question,
      topN: params.topN,
      includeChunks: true,
    });

    return {
      queryWords: retrieval.queryWords,
      hits: retrieval.hits,
      systemPrompt: [
        '你是小说百科助手。',
        '你只能依据系统提供的检索资料和对话历史回答，不允许编造。',
        '如果资料不足，必须明确说明“根据当前提供的资料，暂时无法确定”。',
        '回答风格使用百科式说明，先给定义或结论，再补充依据。',
        '',
        this.buildNovelQaContextPrompt(
          retrieval.hits.map((hit, index) => ({
            index: index + 1,
            id: hit.id,
            summary: hit.summary,
            keywords: hit.keywords,
            characters: hit.characters,
            locations: hit.locations,
            organizations: hit.organizations,
            concepts: hit.concepts,
            events: hit.events,
            chunkText: hit.chunkText || '',
          })),
        ),
      ].join('\n'),
    };
  }

  async rebuildNovelMetaIndex(params: {
    novelCode: string;
    jobId?: string;
  }): Promise<NovelSplitJob> {
    const novelCode = params.novelCode?.trim();
    if (!novelCode) {
      throw new BadRequestException('novelCode 不能为空');
    }

    const job = params.jobId?.trim()
      ? await this.resolveJob(params.jobId)
      : await this.resolveLatestJobByNovelCode(novelCode);
    if (job.novelCode !== novelCode) {
      throw new BadRequestException('jobId 与 novelCode 不匹配');
    }
    if (['splitting', 'meta_generating', 'generating'].includes(job.status)) {
      throw new BadRequestException('任务运行中，暂不能重建索引');
    }

    const chunkFiles = await this.scanChunkFiles(job.chunkDir);
    const restoredStatus = this.resolveStatusAfterRebuild(job);
    const restoredError =
      job.status === 'failed' || job.status === 'aborted' ? job.lastError : '';

    await this.jobModel.updateOne(
      { _id: job._id },
      {
        $set: {
          totalChunks: chunkFiles.length,
          splittedChunks: chunkFiles.length,
          metaGeneratedChunks: 0,
          lastError: '',
        },
      },
    );

    try {
      await this.rebuildNovelMetaIndexForChunks(job.jobId, {
        novelCode,
        chunkDir: job.chunkDir,
        totalChunks: chunkFiles.length,
        chunkFiles,
        resetExisting: true,
      });

      await this.jobModel.updateOne(
        { _id: job._id },
        {
          $set: {
            totalChunks: chunkFiles.length,
            splittedChunks: chunkFiles.length,
            metaGeneratedChunks: chunkFiles.length,
            status: restoredStatus,
            lastError: restoredError,
          },
        },
      );
    } catch (err) {
      await this.jobModel.updateOne(
        { _id: job._id },
        {
          $set: {
            status: restoredStatus,
            lastError: (err as Error).message,
          },
        },
      );
      throw err;
    }

    return (await this.jobModel.findOne({ _id: job._id }).exec())!;
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

  private resolveStatusAfterRebuild(
    job: NovelSplitJobDocument,
  ): NovelSplitJobStatus {
    if (job.status === 'failed' && !job.processedChunks) {
      return 'split_done';
    }
    return job.status;
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
  async findSplitJob(jobId: string): Promise<NovelSplitJob | null> {
    const normalizedJobId = jobId?.trim();
    if (!normalizedJobId) {
      throw new BadRequestException('jobId 不能为空');
    }

    return this.jobModel.findOne({ jobId: normalizedJobId }).exec();
  }

  async startExtractInBackground(jobId: string): Promise<NovelSplitJob> {
    const job = await this.resolveJob(jobId);
    if (job.status === 'splitting' || job.status === 'meta_generating') {
      throw new BadRequestException('任务仍在导入处理中，暂不能开始提取');
    }
    if (job.status === 'done') {
      return job;
    }

    const runningController = this.runningJobs.get(job.jobId);
    if (runningController && !runningController.signal.aborted) {
      return job;
    }

    const controller = new AbortController();
    this.runningJobs.set(job.jobId, controller);

    await this.jobModel.updateOne(
      { _id: job._id },
      {
        $set: {
          status: 'generating',
          lastError: '',
        },
      },
    );

    void this.startExtract({ jobId: job.jobId, signal: controller.signal })
      .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`后台提取任务失败 jobId=${job.jobId}: ${message}`);
      })
      .finally(() => {
        const current = this.runningJobs.get(job.jobId);
        if (current === controller) {
          this.runningJobs.delete(job.jobId);
        }
      });

    return (await this.jobModel.findOne({ jobId: job.jobId }).exec())!;
  }

  async abortJob(jobId: string): Promise<NovelSplitJob> {
    const normalizedJobId = jobId?.trim();
    if (!normalizedJobId) {
      throw new BadRequestException('jobId 不能为空');
    }

    const job = await this.jobModel.findOne({ jobId: normalizedJobId }).exec();
    if (!job) {
      throw new NotFoundException(`未找到任务 ${normalizedJobId}`);
    }

    const controller = this.runningJobs.get(normalizedJobId);
    controller?.abort();
    this.runningJobs.delete(normalizedJobId);

    await this.jobModel.updateOne(
      { _id: job._id },
      {
        $set: {
          status: 'aborted',
          lastError: '任务已中止',
          processingChunkIndex:
            job.lastCompletedChunkIndex || job.processingChunkIndex || 0,
          processedChunks:
            job.lastCompletedChunkIndex || job.processedChunks || 0,
        },
      },
    );

    return (await this.jobModel.findOne({ jobId: normalizedJobId }).exec())!;
  }

  async getAliasCandidates(novelCode: string) {
    const outline = await this.findByNovelCode(novelCode);
    if (!outline) {
      return [];
    }

    return (outline.characters || [])
      .map((character) => ({
        characterName: character.name,
        aliases: uniqueStrings(character.aliases || []),
        aliasCandidates: uniqueStrings(character.aliasCandidates || []),
      }))
      .filter((character) => character.aliasCandidates.length > 0);
  }

  async mergeAlias(params: {
    novelCode: string;
    characterName: string;
    aliasesToConfirm: string[];
  }): Promise<NovelOutline> {
    const novelCode = params.novelCode?.trim();
    const characterName = normalize(params.characterName);
    if (!novelCode || !characterName) {
      throw new BadRequestException('novelCode 和 characterName 不能为空');
    }

    const outline = await this.outlineModel.findOne({ novelCode }).exec();
    if (!outline) {
      throw new NotFoundException(`未找到小说 ${novelCode} 的大纲数据`);
    }

    const target = (outline.characters || []).find(
      (character) => normalize(character.name) === characterName,
    );
    if (!target) {
      throw new NotFoundException(`未找到角色 ${params.characterName}`);
    }

    const aliasesToConfirm = uniqueStrings(params.aliasesToConfirm || []);
    if (!aliasesToConfirm.length) {
      throw new BadRequestException('aliasesToConfirm 不能为空');
    }

    target.aliases = uniqueStrings([
      ...(target.aliases || []),
      ...aliasesToConfirm,
    ]);
    target.aliasCandidates = uniqueStrings(target.aliasCandidates || []).filter(
      (alias) => !aliasesToConfirm.includes(alias),
    );

    await outline.save();
    return outline;
  }

  private async resolveJob(jobId: string): Promise<NovelSplitJobDocument> {
    const normalizedJobId = jobId?.trim();
    if (!normalizedJobId) {
      throw new BadRequestException('jobId 不能为空');
    }

    const job = await this.jobModel
      .findOne({
        jobId: normalizedJobId,
        chunkDir: { $ne: '' },
        totalChunks: { $gt: 0 },
      })
      .exec();
    if (!job) {
      throw new NotFoundException(`未找到任务 ${normalizedJobId}`);
    }

    return job;
  }

  private async resolveLatestJobByNovelCode(
    novelCode: string,
  ): Promise<NovelSplitJobDocument> {
    const normalizedNovelCode = novelCode?.trim();
    if (!normalizedNovelCode) {
      throw new BadRequestException('novelCode 不能为空');
    }

    const job = await this.jobModel
      .findOne({
        novelCode: normalizedNovelCode,
        chunkDir: { $ne: '' },
        totalChunks: { $gt: 0 },
      })
      .sort({ createdAt: -1 })
      .exec();
    if (!job) {
      throw new NotFoundException(`未找到小说 ${normalizedNovelCode} 的任务`);
    }

    return job;
  }

  /**
   * 启动生成任务
   */
  private async startExtract(params: ExtractParams) {
    const { signal } = params;
    const job = await this.resolveJob(params.jobId);
    const novelCode = job.novelCode;
    const jobId = job.jobId;
    if (job.status === 'splitting' || job.status === 'meta_generating') {
      throw new BadRequestException('任务仍在导入处理中，暂不能开始提取');
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
            processedChunks: Math.max(0, chunkIndex - 1),
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
          jobId,
          chunkText,
          chunkIndex,
          totalChunks,
        };

        console.log(`准备提取第 ${chunkIndex}/${totalChunks} 个切片...`);
        const result = await this.chunkExtractor(extractParams);
        console.log(`第 ${chunkIndex}/${totalChunks} 个切片提取完成...`);

        await this.mergeChunkResult({
          novelCode,
          jobId,
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
            processedChunks: chunkIndex,
            lastCompletedChunkFile: `chunk-${String(chunkIndex).padStart(4, '0')}.txt`,
            lastError: '',
          },
        });
      }

      return (await this.jobModel.findOne(jobFilter).exec())!;
    } catch (err) {
      const e = err as Error;
      const aborted = e?.name === 'AbortError' || signal?.aborted;
      const latestJob = await this.jobModel.findOne(jobFilter).exec();
      await this.jobModel.updateOne(jobFilter, {
        $set: {
          status: aborted ? 'aborted' : 'failed',
          lastError: aborted ? '任务已中止' : e.message,
          processedChunks: latestJob?.lastCompletedChunkIndex || 0,
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
    const chunkId = String(chunkIndex).padStart(4, '0');
    const chunkFilePath = await this.resolveChunkFilePath(
      job.chunkDir,
      chunkId,
    );

    try {
      return await fs.readFile(chunkFilePath, 'utf-8');
    } catch {
      throw new NotFoundException(`切片文件不存在：${chunkFilePath}`);
    }
  }

  private async rebuildNovelMetaIndexForChunks(
    jobId: string,
    params: {
      chunkDir: string;
      novelCode: string;
      totalChunks?: number;
      chunkFiles?: ChunkFileEntry[];
      resetExisting?: boolean;
    },
  ): Promise<void> {
    const chunkFiles =
      params.chunkFiles || (await this.scanChunkFiles(params.chunkDir));
    const totalChunks = params.totalChunks || chunkFiles.length;

    if (params.resetExisting) {
      await this.novelMetaModel
        .deleteMany({ novelCode: params.novelCode })
        .exec();
    }

    for (let index = 0; index < chunkFiles.length; index += 1) {
      const chunkFile = chunkFiles[index];
      this.logger.log(
        `[chunk-meta] 开始处理 chunk=${chunkFile.chunkId}, 进度=${index + 1}/${totalChunks}, novelCode=${params.novelCode}`,
      );
      const chunkText = await fs.readFile(chunkFile.filePath, 'utf-8');
      const meta = await this.generateSingleChunkMeta({
        id: chunkFile.chunkId,
        chunkIndex: index + 1,
        totalChunks,
        novelCode: params.novelCode,
        chunkText,
      });

      await this.novelMetaModel
        .updateOne(
          {
            novelCode: params.novelCode,
            chunkId: meta.chunkId,
          },
          { $set: meta },
          { upsert: true },
        )
        .exec();

      this.logger.log(
        `[chunk-meta] 保存成功 chunk=${meta.chunkId}, 当前处理进度：${index + 1}/${totalChunks}, novelCode=${params.novelCode}`,
      );

      await this.jobModel.updateOne(
        { jobId },
        {
          $set: {
            status: 'meta_generating',
            metaGeneratedChunks: index + 1,
            lastError: '',
          },
        },
      );
    }
  }

  private async generateSingleChunkMeta(params: {
    id: string;
    chunkIndex: number;
    totalChunks: number;
    novelCode: string;
    chunkText: string;
  }): Promise<ChunkMeta> {
    const system = [
      '你是小说 Chunk Metadata 生成器。',
      '你的任务是基于一个 chunk 生成可检索的结构化 Metadata，用于 MongoDB 检索索引。',
      '必须遵守：前文参考和后文参考只用于理解上下文，不允许重复提取。',
      '只能从【本段正文】提取当前 chunk 新增的信息。',
      'summary 使用第三人称描述当前 chunk 的核心内容，原则上长度控制在 100~200 字之间（可以超过200字，要保证内容完整，不能截断），优先保留后续检索需要的重要人物、设定、事件和结论。',
      'keywords 必须返回 5 到 10 个关键词，优先提取人物、地点、组织、世界观设定、能力、境界、特殊名词、关键道具、事件名称。',
      'characters、locations、organizations、concepts、events 必须返回字符串数组，没有则返回空数组。',
      'events 只保留当前 chunk 明确发生的关键事件短语，不要写成长段。',
      '禁止输出 markdown、解释文字或额外说明。',
      '必须返回合法 JSON，格式严格如下：{"summary":"","keywords":[],"characters":[],"locations":[],"organizations":[],"concepts":[],"events":[]}',
    ].join('\n');

    const user = [
      `小说编号：${params.novelCode}`,
      `当前 chunk：${params.chunkIndex}/${params.totalChunks}`,
      `chunkId：${params.id}`,
      '',
      '请分析以下 chunk：',
      params.chunkText,
    ].join('\n');

    const response = await this.callLLM<{
      summary?: unknown;
      keywords?: unknown;
      characters?: unknown;
      locations?: unknown;
      organizations?: unknown;
      concepts?: unknown;
      events?: unknown;
    }>({
      system,
      user,
      maxAttempts: this.chunkMetaMaxAttempts,
    });

    const summary = this.truncateByChars(
      normalize(String(response.summary ?? '')),
      150,
    );
    const characters = this.normalizeMetaArray(response.characters, 20);
    const locations = this.normalizeMetaArray(response.locations, 20);
    const organizations = this.normalizeMetaArray(response.organizations, 20);
    const concepts = this.normalizeMetaArray(response.concepts, 20);
    const events = this.normalizeMetaArray(response.events, 20);
    const keywords = uniqueStrings([
      ...(Array.isArray(response.keywords) ? response.keywords : []),
      ...characters,
      ...locations,
      ...organizations,
      ...concepts,
      ...events,
    ]).slice(0, 20);

    if (!summary || Array.from(summary).length < 30) {
      throw new Error(`chunk ${params.id} 的 meta summary 为空`);
    }
    if (keywords.length < 5) {
      throw new Error(`chunk ${params.id} 的 meta keywords 为空`);
    }

    return {
      chunkId: params.id,
      summary,
      keywords,
      characters,
      locations,
      organizations,
      concepts,
      events,
    };
  }

  private async loadAndScoreChunkMetas(params: {
    novelCode: string;
    queryWords: string[];
    topN: number;
    includeChunks?: boolean;
  }): Promise<SearchChunkMetaHit[]> {
    const { chunkDir } = this.resolveNovelDirs(params.novelCode);
    const docs = await this.novelMetaModel
      .find({ novelCode: params.novelCode })
      .sort({ chunkId: 1 })
      .lean()
      .exec();
    if (!docs.length) {
      throw new NotFoundException(`未找到小说 ${params.novelCode} 的索引数据`);
    }

    const hits: SearchChunkMetaHit[] = [];
    for (const doc of docs) {
      const meta: ChunkMeta = {
        chunkId: normalize(doc.chunkId),
        summary: normalize(doc.summary),
        keywords: uniqueStrings(doc.keywords || []),
        characters: uniqueStrings(doc.characters || []),
        locations: uniqueStrings(doc.locations || []),
        organizations: uniqueStrings(doc.organizations || []),
        concepts: uniqueStrings(doc.concepts || []),
        events: uniqueStrings(doc.events || []),
      };
      const score = this.calcMetaScore(meta, params.queryWords);

      if (score <= 0) {
        continue;
      }

      const chunkFilePath = await this.resolveChunkFilePath(
        chunkDir,
        meta.chunkId,
      );
      hits.push({
        id: meta.chunkId,
        score,
        summary: meta.summary,
        keywords: meta.keywords,
        characters: meta.characters,
        locations: meta.locations,
        organizations: meta.organizations,
        concepts: meta.concepts,
        events: meta.events,
        chunkFilePath,
      });
    }

    hits.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id, 'en'));
    const topHits = hits.slice(0, params.topN);
    if (params.includeChunks) {
      await Promise.all(
        topHits.map(async (hit) => {
          hit.chunkText = await fs.readFile(hit.chunkFilePath, 'utf-8');
        }),
      );
    }
    return topHits;
  }

  private calcMetaScore(meta: ChunkMeta, queryWords: string[]): number {
    let score = 0;
    const matchField = (
      values: string[],
      word: string,
      exactWeight: number,
      fuzzyWeight: number,
    ) => {
      const loweredValues = values.map((value) => value.toLowerCase());
      if (loweredValues.some((value) => value === word)) {
        return exactWeight;
      }
      if (loweredValues.some((value) => value.includes(word))) {
        return fuzzyWeight;
      }
      return 0;
    };

    for (const rawWord of queryWords) {
      const word = rawWord.toLowerCase();
      if (!word) continue;
      score += matchField([meta.summary], word, 12, 8);
      score += matchField(meta.keywords, word, 24, 18);
      score += matchField(meta.characters, word, 24, 18);
      score += matchField(meta.locations, word, 20, 14);
      score += matchField(meta.organizations, word, 20, 14);
      score += matchField(meta.concepts, word, 18, 12);
      score += matchField(meta.events, word, 18, 12);
    }

    return score;
  }

  private tokenizeQuery(query: string): string[] {
    const cleaned = query
      .trim()
      .replace(/[？?！!。，、；：,.]/g, ' ')
      .replace(
        /(什么是|是什么|为什么会|为什么|怎么会|怎么样|如何|哪里|哪儿|哪个|是谁|是什么地方|是什么东西)/g,
        ' ',
      )
      .replace(/\s+/g, ' ')
      .trim();

    const tokens = new Set<string>();
    const segments = cleaned.match(/[\u4e00-\u9fa5A-Za-z0-9_]+/g) || [];
    for (const segment of segments) {
      const normalizedSegment = normalize(segment);
      if (normalizedSegment.length >= 2) {
        tokens.add(normalizedSegment);
      }

      const chars = Array.from(normalizedSegment);
      for (let size = 2; size <= 4; size += 1) {
        if (chars.length < size) continue;
        for (let i = 0; i <= chars.length - size; i += 1) {
          const word = chars.slice(i, i + size).join('');
          if (word.length >= 2) {
            tokens.add(word);
          }
        }
      }
    }

    if (!tokens.size) {
      const fallback = normalize(cleaned);
      if (fallback) {
        tokens.add(fallback);
      }
    }

    return Array.from(tokens);
  }

  private buildNovelQaContextPrompt(
    chunks: Array<{
      index: number;
      id: string;
      summary: string;
      keywords: string[];
      characters?: string[];
      locations?: string[];
      organizations?: string[];
      concepts?: string[];
      events?: string[];
      chunkText: string;
    }>,
  ): string {
    return [
      '以下是与问题相关的小说检索资料，请仅基于这些资料回答：',
      ...chunks.map((chunk) =>
        [
          `资料${chunk.index}｜Chunk ${chunk.id}`,
          `摘要：${chunk.summary}`,
          `关键词：${chunk.keywords.join('、')}`,
          `人物：${(chunk.characters || []).join('、') || '无'}`,
          `地点：${(chunk.locations || []).join('、') || '无'}`,
          `组织：${(chunk.organizations || []).join('、') || '无'}`,
          `概念：${(chunk.concepts || []).join('、') || '无'}`,
          `事件：${(chunk.events || []).join('、') || '无'}`,
          '原文：',
          chunk.chunkText,
        ].join('\n'),
      ),
    ].join('\n\n');
  }

  private resolveNovelDirs(novelCode: string) {
    const safeNovelCode = this.toSafeNovelCode(novelCode);
    const novelDir = path.join(this.uploadRoot, safeNovelCode);
    return {
      novelDir,
      chunkDir: path.join(novelDir, 'chunks'),
    };
  }

  private toSafeNovelCode(novelCode: string): string {
    return (
      (novelCode || '').replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 40) ||
      'unknown'
    );
  }

  private extractChunkId(fileName: string): string {
    const matched = path.parse(fileName).name.match(/(\d{4,})$/);
    return matched?.[1] || path.parse(fileName).name;
  }

  private truncateByChars(text: string, maxChars: number): string {
    const chars = Array.from(text);
    return chars.length <= maxChars ? text : chars.slice(0, maxChars).join('');
  }

  private normalizeMetaArray(value: unknown, maxLength: number): string[] {
    return uniqueStrings(Array.isArray(value) ? value : []).slice(0, maxLength);
  }

  private async scanChunkFiles(chunkDir: string): Promise<ChunkFileEntry[]> {
    let fileNames: string[] = [];
    try {
      fileNames = await fs.readdir(chunkDir);
    } catch {
      throw new NotFoundException(`未找到切片目录：${chunkDir}`);
    }

    const chunkFiles = fileNames
      .filter((fileName) => fileName.endsWith('.txt'))
      .map((fileName) => ({
        chunkId: this.extractChunkId(fileName),
        filePath: path.join(chunkDir, fileName),
      }))
      .filter((item) => item.chunkId)
      .sort((a, b) =>
        a.chunkId.localeCompare(b.chunkId, 'en', { numeric: true }),
      );

    if (!chunkFiles.length) {
      throw new NotFoundException(`切片目录中未找到 chunk 文件：${chunkDir}`);
    }

    return chunkFiles;
  }

  private async resolveChunkFilePath(
    chunkDir: string,
    chunkId: string,
  ): Promise<string> {
    const candidates = [
      path.join(chunkDir, `${chunkId}.txt`),
      path.join(chunkDir, `chunk-${chunkId}.txt`),
    ];

    for (const filePath of candidates) {
      try {
        await fs.access(filePath);
        return filePath;
      } catch {
        continue;
      }
    }

    return candidates[1];
  }

  /**
   * 提取（并发执行所有提取任务）
   */
  private async chunkExtractor(params: ResolvedExtractParams) {
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
  private async characterExtractor(params: ResolvedExtractParams) {
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
  private async worldExtractor(params: ResolvedExtractParams) {
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
  private async plotExtractor(params: ResolvedExtractParams) {
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
