import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { OpenaiService } from '../../shared/openai/openai.service';
import { NovelOutline, OutlineCharacter } from './schemas/novel-outline.schema';

/**
 * 结构变更为"增量更新负载"
 */
export interface OutlineUpdatePayload {
  synopsis: string;
  worldSetting: string;
  newPlotSegments: string; // 关键：改为返回本段新剧情
  storyConflicts: string; // 故事矛盾和冲突点
  characters: OutlineCharacter[];
}

@Injectable()
export class OutlineGeneratorService {
  private readonly logger = new Logger(OutlineGeneratorService.name);
  private readonly llmLogRoot = path.resolve(
    process.cwd(),
    'uploads',
    'novel-outline-llm-logs',
  );

  constructor(private readonly openaiService: OpenaiService) {}

  async updateOutlineWithChunk(
    logContext: {
      jobId: string;
      novelCode: string;
    },
    existing: {
      synopsis?: string;
      worldSetting?: string;
      plotOutline?: string;
      storyConflicts?: string;
    },
    matchedCharacters: OutlineCharacter[],
    chunkIndex: number,
    totalChunks: number,
    chunkText: string,
    signal?: AbortSignal,
  ): Promise<{ payload: OutlineUpdatePayload; raw: string }> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(
      existing,
      matchedCharacters,
      chunkIndex,
      totalChunks,
      chunkText,
    );

    const maxAttempts = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        console.log(
          `[novel-outline] LLM: 开始请求 chunk=${chunkIndex}/${totalChunks}, attempt=${attempt}, jsonMode=${attempt === 1}`,
        );
        await this.writeLlmLog(logContext, chunkIndex, attempt, 'request', {
          jobId: logContext.jobId,
          novelCode: logContext.novelCode,
          chunkIndex,
          totalChunks,
          attempt,
          jsonMode: attempt === 1,
          model: this.openaiService.model,
          systemPrompt,
          userPrompt,
          matchedCharacters,
          createdAt: new Date().toISOString(),
        });

        const completion =
          await this.openaiService.client.chat.completions.create(
            {
              model: this.openaiService.model,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
              ],
              ...(attempt === 1
                ? { response_format: { type: 'json_object' as const } }
                : {}),
              temperature: 0.3,
              max_tokens: 12000,
            },
            { signal },
          );

        const raw = completion.choices?.[0]?.message?.content?.trim() ?? '';
        await this.writeLlmLog(logContext, chunkIndex, attempt, 'response', {
          jobId: logContext.jobId,
          novelCode: logContext.novelCode,
          chunkIndex,
          totalChunks,
          attempt,
          id: completion.id,
          model: completion.model,
          finishReason: completion.choices?.[0]?.finish_reason ?? 'unknown',
          usage: completion.usage ?? null,
          raw,
          createdAt: new Date().toISOString(),
        });

        if (!raw) {
          throw new Error(
            this.buildEmptyResponseErrorMessage(completion, attempt),
          );
        }

        console.log(
          `[novel-outline] LLM: 收到响应 chunk=${chunkIndex}/${totalChunks}, attempt=${attempt}, chars=${Array.from(raw).length}, finish_reason=${completion.choices?.[0]?.finish_reason ?? 'unknown'}`,
        );
        const payload = this.parsePayload(raw);
        console.log(
          `[novel-outline] LLM: JSON解析完成 chunk=${chunkIndex}/${totalChunks}, characters=${payload.characters.length}`,
        );
        return { payload, raw };
      } catch (err) {
        const e = err as Error;
        if (e?.name === 'AbortError' || signal?.aborted) throw e;

        console.log(
          `[novel-outline] LLM: 请求失败 chunk=${chunkIndex}/${totalChunks}, attempt=${attempt}, error=${e.message}`,
        );
        await this.writeLlmLog(logContext, chunkIndex, attempt, 'error', {
          jobId: logContext.jobId,
          novelCode: logContext.novelCode,
          chunkIndex,
          totalChunks,
          attempt,
          errorName: e.name,
          errorMessage: e.message,
          errorStack: e.stack,
          createdAt: new Date().toISOString(),
        });

        lastError = e;
        if (attempt >= maxAttempts) break;

        this.logger.warn(
          `[outline-gen] 第 ${chunkIndex}/${totalChunks} 块第 ${attempt} 次生成失败，将重试：${e.message}`,
        );
        await this.sleep(600 * attempt, signal);
      }
    }

    throw lastError ?? new Error('大模型生成失败');
  }

  private buildSystemPrompt(): string {
    console.log('[novel-outline] 构建系统提示词');
    return [
      '你是一位资深小说编辑助手。你需要阅读小说片段，并提取相关的大纲更新信息。',
      '请基于"背景信息"和"新片段"，仅输出【增量更新】部分：',
      '1. synopsis/worldSetting：只输出新片段中新增的信息点；如果没有新增，请输出空字符串。不要改写、总结或重复背景参考中已有内容。',
      '2. newPlotSegments：提取本片段发生的剧情概要（本段正文自身），不要输出之前已有的剧情，也不要把前文/后文参考当成新增剧情。',
      '3. storyConflicts：识别本片段中的故事矛盾和冲突点（如人物之间的矛盾、内心挣扎、外部压力等），用简洁的语言描述。',
      '4. characters：识别本片段中出现的所有人物。',
      '   - 对于每个人物，需要提取：name(主要称呼), aliases(已确认的别名), aliasCandidates(可能的别名候选，待用户确认), identity, personality, goals, traits, relations；其中 identity/personality/goals/traits/relations 均输出字符串数组。',
      '   - 重要：同一人物在不同场景可能有不同称呼（如"张三"、"小张"、"小三"），请将所有可能的称呼都放入 aliasCandidates 数组中，由后续人工确认是否合并到 aliases。',
      '   - 如果某个称呼可能是某个人物的别名但不确定，务必放入 aliasCandidates 而非 aliases。',
      '硬性要求：只输出 JSON，严禁任何解释文字。',
    ].join('\n');
  }

  private buildUserPrompt(
    existing: any,
    matchedCharacters: OutlineCharacter[],
    index: number,
    total: number,
    text: string,
  ): string {
    // 关键优化：为了防止 Prompt 爆炸，只传回最近 3000 字的剧情作为模型参考上下文
    const plotRef =
      existing.plotOutline?.length > 3000
        ? `...[之前剧情已省略]...\n${existing.plotOutline.slice(-3000)}`
        : existing.plotOutline;

    const contextJson = JSON.stringify({
      synopsis: existing.synopsis || '',
      worldSetting: existing.worldSetting || '',
      recentPlotContext: plotRef,
      storyConflicts: existing.storyConflicts || '',
      matchedCharacterCount: matchedCharacters.length,
      matchedCharacters: matchedCharacters.map((c) => ({
        name: c.name,
        aliases: c.aliases || [],
        aliasCandidates: c.aliasCandidates || [],
        identity: c.identity || [],
        personality: c.personality || [],
        goals: c.goals || [],
        traits: c.traits || [],
        relations: c.relations || [],
      })),
    });

    console.log(
      `[novel-outline] 构建第 ${index}/${total} 块 prompt，匹配人物 ${matchedCharacters.length} 个，chunk chars=${Array.from(text).length}`,
    );

    return [
      `【背景参考（JSON）】`,
      contextJson,
      '',
      `【新片段（第 ${index} / ${total} 块，含前后参考与本段正文标记）】`,
      text,
      '',
      '请根据新片段输出 JSON：',
      '{',
      '  "synopsis": "仅新增的简介信息，没有则为空字符串",',
      '  "worldSetting": "仅新增的世界观设定，没有则为空字符串",',
      '  "newPlotSegments": "仅本片段的完整剧情概要",',
      '  "storyConflicts": "本片段中的故事矛盾和冲突点",',
      '  "characters": [{"name":"","aliases":[],"aliasCandidates":[],"identity":[],"personality":[],"goals":[],"traits":[],"relations":[]}]',
      '}',
    ].join('\n');
  }

  private parsePayload(raw: string): OutlineUpdatePayload {
    if (!raw.trim()) throw new Error('大模型返回内容为空');

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('无法解析 JSON');
      parsed = JSON.parse(match[0]);
    }

    const safeStr = (v: any) => (typeof v === 'string' ? v : '');

    return {
      synopsis: safeStr(parsed.synopsis),
      worldSetting: safeStr(parsed.worldSetting),
      newPlotSegments: safeStr(parsed.newPlotSegments || parsed.plotOutline),
      storyConflicts: safeStr(parsed.storyConflicts),
      characters: Array.isArray(parsed.characters) ? parsed.characters : [],
    };
  }

  private buildEmptyResponseErrorMessage(completion: any, attempt: number) {
    const choice = completion?.choices?.[0];
    const finishReason = choice?.finish_reason ?? 'unknown';
    const id = completion?.id ?? 'unknown';
    const usage = completion?.usage ? JSON.stringify(completion.usage) : '{}';
    return `大模型返回内容为空（attempt=${attempt}, id=${id}, finish_reason=${finishReason}, usage=${usage}）`;
  }

  private sleep(ms: number, signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) {
      return Promise.reject(new DOMException('Aborted', 'AbortError'));
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, ms);
      signal?.addEventListener(
        'abort',
        () => {
          clearTimeout(timer);
          reject(new DOMException('Aborted', 'AbortError'));
        },
        { once: true },
      );
    });
  }

  private async writeLlmLog(
    context: { jobId: string; novelCode: string },
    chunkIndex: number,
    attempt: number,
    phase: 'request' | 'response' | 'error',
    payload: unknown,
  ): Promise<void> {
    try {
      const dir = path.join(this.llmLogRoot, this.safeFileName(context.jobId));
      await fs.mkdir(dir, { recursive: true });

      const fileName = `chunk-${String(chunkIndex).padStart(4, '0')}-attempt-${attempt}-${phase}.json`;
      const filePath = path.join(dir, fileName);
      await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8');

      console.log(`[novel-outline] LLM日志已写入: ${filePath}`);
    } catch (err) {
      const e = err as Error;
      console.log(`[novel-outline] LLM日志写入失败: ${e.message}`);
    }
  }

  private safeFileName(value: string): string {
    return (value || 'unknown').replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 120);
  }
}
