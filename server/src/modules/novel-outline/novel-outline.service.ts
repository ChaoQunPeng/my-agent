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
    console.log('[novel-outline] upload-and-split: 开始创建拆分任务');
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
   * 启动大纲生成
   */
  async startGenerate(jobId: string): Promise<NovelSplitJob> {
    console.log(`[novel-outline] generate: 请求启动任务 jobId=${jobId}`);
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
    console.log(`[novel-outline] gen-loop: 开始 jobId=${jobId}`);
    try {
      while (true) {
        const job = await this.jobModel.findOne({ jobId }).exec();
        if (!job || job.status !== 'generating') return;

        if (job.processedChunks >= job.totalChunks) {
          console.log(`[novel-outline] gen-loop: 全部完成 jobId=${jobId}`);
          await this.jobModel.updateOne(
            { jobId },
            { $set: { status: 'done' } },
          );
          return;
        }

        const nextIndex = job.processedChunks + 1;
        const fileName = `chunk-${String(nextIndex).padStart(4, '0')}.txt`;
        const filePath = path.join(job.chunkDir, fileName);
        console.log(
          `[novel-outline] gen-loop: 读取切片 jobId=${jobId}, chunk=${nextIndex}/${job.totalChunks}, file=${fileName}`,
        );
        const chunkText = await fs.readFile(filePath, 'utf-8');
        await this.jobModel.updateOne(
          { jobId },
          { $set: { processingChunkIndex: nextIndex } },
        );

        // 读取当前大纲
        const existing =
          (await this.outlineModel
            .findOne({ novelCode: job.novelCode })
            .exec()) ?? this.emptyOutline(job.novelCode);
        console.log(
          `[novel-outline] gen-loop: 已读取本地大纲 novelCode=${job.novelCode}, characters=${existing.characters?.length || 0}`,
        );

        const matchedCharacters = this.findMatchedCharactersInChunk(
          chunkText,
          existing.characters || [],
        );
        console.log(
          `[novel-outline] gen-loop: 本地匹配当前切片人物 ${matchedCharacters.length} 个：${matchedCharacters.map((c) => c.name).join(', ') || '无'}`,
        );

        // 调用大模型获取“增量”
        console.log(
          `[novel-outline] gen-loop: 调用大模型 jobId=${jobId}, chunk=${nextIndex}/${job.totalChunks}`,
        );
        const { payload, raw } = await this.generator.updateOutlineWithChunk(
          {
            jobId,
            novelCode: job.novelCode,
          },
          {
            synopsis: existing.synopsis,
            worldSetting: existing.worldSetting,
            plotOutline: existing.plotOutline,
            storyConflicts: existing.storyConflicts,
          },
          matchedCharacters,
          nextIndex,
          job.totalChunks,
          chunkText,
          signal,
        );

        // 校验中止状态
        const afterCall = await this.jobModel.findOne({ jobId }).exec();
        if (!afterCall || afterCall.status !== 'generating') return;
        console.log(
          `[novel-outline] gen-loop: 大模型返回成功 jobId=${jobId}, chunk=${nextIndex}, rawChars=${Array.from(raw).length}`,
        );

        // --- 执行合并逻辑 ---

        const updatedCharacters = this.mergeCharactersIncrementally(
          existing.characters || [],
          payload.characters || [],
        );

        // 保存更新后的完整大纲
        await this.outlineModel.updateOne(
          { novelCode: job.novelCode },
          {
            $set: {
              synopsis: this.appendText(existing.synopsis, payload.synopsis),
              worldSetting: this.appendText(
                existing.worldSetting,
                payload.worldSetting,
              ),
              plotOutline: this.appendText(
                existing.plotOutline,
                payload.newPlotSegments,
              ),
              storyConflicts: this.appendLinesUnique(
                existing.storyConflicts,
                payload.storyConflicts,
              ),
              characters: updatedCharacters,
              lastJobId: jobId,
              rawLastResponse: raw,
            },
            $setOnInsert: { novelCode: job.novelCode },
          },
          { upsert: true },
        );

        await this.jobModel.updateOne(
          { jobId },
          {
            $set: {
              processedChunks: nextIndex,
              processingChunkIndex: 0,
              lastCompletedChunkIndex: nextIndex,
              lastCompletedChunkFile: fileName,
            },
          },
        );
        console.log(
          `[novel-outline] gen-loop: 切片处理完成 jobId=${jobId}, chunk=${nextIndex}/${job.totalChunks}, newCharacters=${payload.characters?.length || 0}`,
        );
      }
    } catch (err) {
      const e = err as Error;
      if (e?.name === 'AbortError' || signal.aborted) return;

      const latest = await this.jobModel.findOne({ jobId }).exec();
      if (latest && latest.status === 'aborted') return;

      this.logger.error(`[gen-loop] 任务失败 jobId=${jobId}: ${e?.stack}`);
      console.log(
        `[novel-outline] gen-loop: 任务失败 jobId=${jobId}, error=${e?.message}`,
      );
      await this.jobModel.updateOne(
        { jobId },
        { $set: { status: 'failed', lastError: e?.message } },
      );
    }
  }

  /**
   * 中止生成任务。保留切片文件和 processedChunks，便于之后从断点续跑。
   */
  async abortJob(jobId: string): Promise<void> {
    console.log(`[novel-outline] abort: 请求中止任务 jobId=${jobId}`);
    await this.findJobOrThrow(jobId);
    const controller = this.jobControllers.get(jobId);
    if (controller) {
      controller.abort();
      this.jobControllers.delete(jobId);
    }
    await this.jobModel.updateOne(
      { jobId },
      { $set: { status: 'aborted', processingChunkIndex: 0 } },
    );
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

  /**
   * 获取待确认的别名候选列表
   * 返回格式：[{ characterName, aliasCandidates }]
   */
  async getAliasCandidates(novelCode: string): Promise<
    Array<{
      characterName: string;
      aliases: string[];
      aliasCandidates: string[];
    }>
  > {
    const outline = await this.outlineModel.findOne({ novelCode }).exec();
    if (!outline || !outline.characters) {
      return [];
    }

    // 过滤出有候选别名的人物
    return outline.characters
      .filter((char) => char.aliasCandidates && char.aliasCandidates.length > 0)
      .map((char) => ({
        characterName: char.name,
        aliases: char.aliases || [],
        aliasCandidates: char.aliasCandidates || [],
      }));
  }

  /**
   * 合并别名：将候选别名移动到正式别名数组，并从候选列表中移除
   */
  async mergeAlias(params: {
    novelCode: string;
    characterName: string;
    aliasesToConfirm: string[];
  }): Promise<void> {
    const { novelCode, characterName, aliasesToConfirm } = params;

    const outline = await this.outlineModel.findOne({ novelCode }).exec();
    if (!outline || !outline.characters) {
      throw new NotFoundException(`未找到小说大纲: ${novelCode}`);
    }

    const charIndex = outline.characters.findIndex(
      (c) => c.name === characterName,
    );
    if (charIndex === -1) {
      throw new NotFoundException(`未找到人物: ${characterName}`);
    }

    const confirmed = this.uniqueStrings(aliasesToConfirm);
    const characters = [...outline.characters];
    let target = characters[charIndex];

    const sourceIndexes = characters
      .map((char, index) => ({ char, index }))
      .filter(({ char, index }) => {
        if (index === charIndex) return false;
        const names = this.characterNames(char);
        return confirmed.some((alias) => names.includes(alias));
      })
      .map(({ index }) => index);

    target = {
      ...target,
      aliases: this.uniqueStrings([...(target.aliases || []), ...confirmed]),
      aliasCandidates: this.uniqueStrings(
        (target.aliasCandidates || []).filter((c) => !confirmed.includes(c)),
      ),
    };

    for (const sourceIndex of sourceIndexes) {
      target = this.mergeCharacter(target, characters[sourceIndex]);
    }

    const sourceIndexSet = new Set(sourceIndexes);
    const mergedCharacters = characters.flatMap((char, index) => {
      if (index === charIndex) return [target];
      if (sourceIndexSet.has(index)) return [];
      return [char];
    });

    await this.outlineModel.updateOne(
      { novelCode },
      { $set: { characters: mergedCharacters } },
    );
  }

  private mergeCharactersIncrementally(
    existing: OutlineCharacter[],
    incoming: OutlineCharacter[],
  ): OutlineCharacter[] {
    const merged = existing.map((char) => ({ ...char }));

    for (const next of incoming) {
      if (!next?.name) continue;
      const targetIndex = merged.findIndex((char) =>
        this.isSameCharacter(char, next),
      );

      if (targetIndex === -1) {
        merged.push(this.normalizeCharacter(next));
        continue;
      }

      merged[targetIndex] = this.mergeCharacter(merged[targetIndex], next);
    }

    return merged;
  }

  private findMatchedCharactersInChunk(
    chunkText: string,
    characters: OutlineCharacter[],
  ): OutlineCharacter[] {
    const normalizedChunk = this.normalizeText(chunkText);

    return characters.filter((character) => {
      const names = this.characterNames(character);
      return names.some((name) => {
        const normalizedName = this.normalizeText(name);
        return (
          chunkText.includes(name) ||
          (!!normalizedName && normalizedChunk.includes(normalizedName))
        );
      });
    });
  }

  private mergeCharacter(
    base: OutlineCharacter,
    incoming: OutlineCharacter,
  ): OutlineCharacter {
    const aliases = this.uniqueStrings([
      ...(base.aliases || []),
      ...(incoming.aliases || []),
    ]);
    const candidateBlacklist = this.uniqueStrings([
      base.name,
      incoming.name,
      ...aliases,
    ]);

    return {
      name: base.name || incoming.name,
      aliases,
      aliasCandidates: this.uniqueStrings([
        ...(base.aliasCandidates || []),
        ...(incoming.aliasCandidates || []),
      ]).filter((alias) => !candidateBlacklist.includes(alias)),
      identity: this.appendText(base.identity, incoming.identity),
      personality: this.appendText(base.personality, incoming.personality),
      goals: this.appendText(base.goals, incoming.goals),
      traits: this.appendText(base.traits, incoming.traits),
      relations: this.appendText(base.relations, incoming.relations),
    };
  }

  private normalizeCharacter(char: OutlineCharacter): OutlineCharacter {
    return {
      name: char.name,
      aliases: this.uniqueStrings(char.aliases || []),
      aliasCandidates: this.uniqueStrings(char.aliasCandidates || []),
      identity: char.identity || '',
      personality: char.personality || '',
      goals: char.goals || '',
      traits: char.traits || '',
      relations: char.relations || '',
    };
  }

  private isSameCharacter(
    existing: OutlineCharacter,
    incoming: OutlineCharacter,
  ): boolean {
    const left = this.confirmedCharacterNames(existing);
    const right = this.confirmedCharacterNames(incoming);
    return left.some((name) => right.includes(name));
  }

  private characterNames(char: OutlineCharacter): string[] {
    return this.uniqueStrings([
      char.name,
      ...(char.aliases || []),
      ...(char.aliasCandidates || []),
    ]);
  }

  private confirmedCharacterNames(char: OutlineCharacter): string[] {
    return this.uniqueStrings([char.name, ...(char.aliases || [])]);
  }

  private appendText(existing?: string, incoming?: string): string {
    const oldText = (existing || '').trim();
    const newText = (incoming || '').trim();
    if (!newText) return oldText;
    if (!oldText) return newText;
    if (this.normalizeText(oldText) === this.normalizeText(newText))
      return oldText;
    if (this.normalizeText(oldText).includes(this.normalizeText(newText))) {
      return oldText;
    }
    return `${oldText}\n\n${newText}`;
  }

  private appendLinesUnique(existing?: string, incoming?: string): string {
    const lines = [
      ...(existing || '').split('\n'),
      ...(incoming || '').split('\n'),
    ]
      .map((line) => line.trim())
      .filter(Boolean);
    return this.uniqueStrings(lines).join('\n');
  }

  private uniqueStrings(values: Array<string | undefined | null>): string[] {
    return Array.from(
      new Set(
        values
          .map((value) => (typeof value === 'string' ? value.trim() : ''))
          .filter(Boolean),
      ),
    );
  }

  private normalizeText(value: string): string {
    return value.replace(/\s+/g, '');
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
      storyConflicts: '',
      plotOutline: '',
      characters: [],
    } as any;
  }
}
