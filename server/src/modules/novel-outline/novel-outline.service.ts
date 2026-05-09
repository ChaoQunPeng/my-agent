import {
  Injectable,
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
import { OpenaiService } from 'src/shared/openai/openai.service';

/**
 * 小说大纲生成核心服务
 * 负责：任务落库、拆分调度、大纲生成调度、断点续跑、失败清理
 */

interface ExtractParams {
  novelCode: string;

  jobId?: string;

  chunkText: string;

  chunkIndex: number;

  totalChunks: number;

  signal?: AbortSignal;
}
@Injectable()
export class NovelOutlineService {
  // 上传根目录（放在 server/uploads/novel-splits 下）
  private readonly uploadRoot: string;

  constructor(
    @InjectModel(NovelSplitJob.name)
    private jobModel: Model<NovelSplitJobDocument>,
    @InjectModel(NovelOutline.name)
    private outlineModel: Model<NovelOutlineDocument>,
    private readonly splitter: SplitterService,
    private readonly openaiService: OpenaiService,
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
    } catch {}
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
   * 启动生成任务
   */
  async startExtract(params: ExtractParams) {
    const { novelCode, chunkIndex, totalChunks, chunkText, signal } = params;
    if (!novelCode?.trim()) {
      throw new BadRequestException('novelCode 不能为空');
    }
    if (!chunkText?.trim()) {
      throw new BadRequestException('chunkText 不能为空');
    }
    if (chunkIndex < 1 || totalChunks < chunkIndex) {
      throw new BadRequestException('chunkIndex / totalChunks 不合法');
    }

    let job: NovelSplitJobDocument | null = null;
    if (params.jobId) {
      job = await this.jobModel.findOne({ jobId: params.jobId }).exec();
      if (!job) {
        throw new NotFoundException(`任务不存在：${params.jobId}`);
      }
      if (job.status === 'splitting') {
        throw new BadRequestException('任务仍在拆分中，暂不能开始提取');
      }
    } else {
      const safeNovelCode =
        novelCode.replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 40) || 'unknown';
      const jobId = `extract_${safeNovelCode}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      job = await this.jobModel.create({
        jobId,
        novelCode,
        sourceFileName: '',
        totalChars: Array.from(chunkText).length,
        chunkSize: Array.from(chunkText).length,
        overlap: 0,
        chunkDir: '',
        sourceFilePath: '',
        totalChunks,
        processingChunkIndex: chunkIndex,
        lastCompletedChunkIndex: chunkIndex - 1,
        status: 'generating',
      });
    }

    await this.jobModel.updateOne(
      { jobId: job.jobId },
      {
        $set: {
          status: 'generating',
          processingChunkIndex: chunkIndex,
          totalChunks,
          lastError: '',
        },
      },
    );

    try {
      const result = await this.chunkExtractor({
        ...params,
        jobId: job.jobId,
      });

      const normalize = (value: unknown): string =>
        typeof value === 'string' ? value.trim() : '';
      const uniqueStrings = (values: unknown[]): string[] => {
        const seen = new Set<string>();
        const output: string[] = [];
        for (const value of values) {
          const text = normalize(value);
          if (!text || seen.has(text)) continue;
          seen.add(text);
          output.push(text);
        }
        return output;
      };
      const mergeText = (...parts: unknown[]): string =>
        uniqueStrings(parts.map((part) => normalize(part))).join('\n');
      const toStringArray = (value: unknown): string[] => {
        if (Array.isArray(value)) return uniqueStrings(value);
        const text = normalize(value);
        return text ? [text] : [];
      };

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

        const aliases = uniqueStrings(raw.aliases || []);
        const aliasCandidates = uniqueStrings(raw.aliasCandidates || []);
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
            identity: normalize(raw.identity),
            personality: normalize(raw.personality),
            goals: normalize(raw.goals),
            traits: normalize(raw.traits),
            relations: normalize(raw.relations),
          });
          continue;
        }

        matched.aliases = uniqueStrings([
          ...(matched.aliases || []),
          ...aliases,
        ]);
        matched.aliasCandidates = uniqueStrings([
          ...(matched.aliasCandidates || []),
          ...aliasCandidates.filter(
            (candidate) =>
              candidate !== matched.name &&
              !matched.aliases?.includes(candidate),
          ),
        ]);
        matched.identity = mergeText(matched.identity, raw.identity);
        matched.personality = mergeText(matched.personality, raw.personality);
        matched.goals = mergeText(matched.goals, raw.goals);
        matched.traits = mergeText(matched.traits, raw.traits);
        matched.relations = mergeText(matched.relations, raw.relations);
      }

      const incomingWorld = result.worldResult?.worldview;
      const currentWorld = existing.worldView || {};
      const worldView =
        incomingWorld && typeof incomingWorld === 'object'
          ? {
              worldType: currentWorld.worldType || '',
              summary: uniqueStrings([
                currentWorld.summary || '',
                ...toStringArray(incomingWorld.cultivationSystem),
                ...toStringArray(incomingWorld.locations),
                ...toStringArray(incomingWorld.technologyOrMagic),
              ]).join('\n'),
              socialStructure: uniqueStrings([
                currentWorld.socialStructure || '',
                ...toStringArray(incomingWorld.factions),
              ]).join('\n'),
              coreRules: uniqueStrings([
                ...(currentWorld.coreRules || []),
                ...toStringArray(incomingWorld.rules),
              ]),
            }
          : currentWorld;

      const currentEvents = (existing.events || []).filter(
        (event) => event.chunkIndex !== chunkIndex,
      );
      const incomingEvents = (result.plotResult?.plotSegments || [])
        .map((item) => ({
          title: normalize(item.title),
          summary: mergeText(item.summary, item.impact),
          characters: uniqueStrings(item.involvedCharacters || []),
          chunkIndex,
        }))
        .filter((item) => item.title);

      existing.set({
        lastJobId: job.jobId,
        characters,
        worldView,
        events: [...currentEvents, ...incomingEvents],
      });
      await existing.save();

      const nextStatus = chunkIndex >= totalChunks ? 'done' : 'generating';
      await this.jobModel.updateOne(
        { jobId: job.jobId },
        {
          $set: {
            status: nextStatus,
            processingChunkIndex:
              nextStatus === 'done' ? totalChunks : chunkIndex + 1,
            lastCompletedChunkIndex: chunkIndex,
            lastError: '',
          },
        },
      );

      return (await this.jobModel.findOne({ jobId: job.jobId }).exec())!;
    } catch (err) {
      const e = err as Error;
      const aborted = e?.name === 'AbortError' || signal?.aborted;
      await this.jobModel.updateOne(
        { jobId: job.jobId },
        {
          $set: {
            status: aborted ? 'aborted' : 'failed',
            lastError: aborted ? '任务已中止' : e.message,
          },
        },
      );
      throw err;
    }
  }

  /**
   * 提取
   */
  async chunkExtractor(params: ExtractParams) {
    const characterResult = await this.characterExtractor(params);

    const worldResult = await this.worldExtractor(params);

    const plotResult = await this.plotExtractor(params);

    return {
      characterResult,
      worldResult,
      plotResult,
    };
  }

  private async callLLM<T>(params: {
    system: string;
    user: string;
    signal?: AbortSignal;
  }): Promise<T> {
    const completion = await this.openaiService.client.chat.completions.create(
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

    try {
      const raw = completion.choices?.[0]?.message?.content?.trim() ?? '';
      if (!raw) {
        throw new Error('返回内容为空');
      }
      return JSON.parse(raw);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      throw new Error(`LLM返回JSON解析失败: ${errorMsg}`);
    }
  }

  /**
   * 角色提取器
   */
  async characterExtractor(params: ExtractParams) {
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
      "identity": "身份/背景",
      "personality": "性格",
      "goals": "目标",
      "traits": "特征",
      "relations": "关系"
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

    return this.callLLM<{
      characters: any[];
    }>({ system, user, signal });
  }

  /**
   * 世界观提取器
   */
  async worldExtractor(params: ExtractParams) {
    const { chunkText, chunkIndex, totalChunks, novelCode, signal } = params;

    const system = `
你是小说世界观抽取器，只负责提取【世界设定】。

严格规则：
- 只能提取世界设定相关内容
- 禁止提取人物与剧情
- 输出必须是 JSON
- 尽量结构化，不要长文本堆叠

输出格式：

{
  "worldview": {
    "cultivationSystem": [],
    "factions": [],
    "locations": [],
    "rules": [],
    "technologyOrMagic": []
  }
}
`;

    const user = `
小说编号：${novelCode}
当前chunk：${chunkIndex}/${totalChunks}

文本：
${chunkText}
`;

    return this.callLLM<{
      worldview: {
        cultivationSystem: string[];
        factions: string[];
        locations: string[];
        rules: string[];
        technologyOrMagic: string[];
      };
    }>({ system, user, signal });
  }

  /**
   * 剧情提取器
   */
  async plotExtractor(params: ExtractParams) {
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
      "summary": "发生了什么",
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

    return this.callLLM<{
      plotSegments: Array<{
        title: string;
        summary: string;
        involvedCharacters: string[];
        impact: string;
      }>;
    }>({ system, user, signal });
  }
}
