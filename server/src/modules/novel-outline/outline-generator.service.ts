import { Injectable, Logger } from '@nestjs/common';
import { OpenaiService } from '../../shared/openai/openai.service';
import {
  NovelOutline,
  OutlineCharacter,
} from './schemas/novel-outline.schema';

/**
 * 大模型返回期望的 JSON 结构
 * 注意：结构与 NovelOutline schema 保持一致，便于直接 upsert
 */
export interface OutlineUpdatePayload {
  synopsis: string;
  worldSetting: string;
  plotMainline: string;
  plotOutline: string;
  characters: OutlineCharacter[];
}

/**
 * 大纲生成服务
 * 职责：拿到"已知大纲 + 新增一块原文" → 让大模型输出更新后的大纲（JSON）
 */
@Injectable()
export class OutlineGeneratorService {
  private readonly logger = new Logger(OutlineGeneratorService.name);

  constructor(private readonly openaiService: OpenaiService) {}

  /**
   * 核心方法：根据已知大纲 + 新片段，增量更新大纲
   * @param existing 已有大纲快照（首次调用时可能各字段都为空字符串 / 空数组）
   * @param chunkIndex 当前片段索引（从 1 开始），仅用于日志
   * @param totalChunks 总片段数，仅用于日志
   * @param chunkText 本次新增的片段内容
   */
  async updateOutlineWithChunk(
    existing: Pick<
      NovelOutline,
      'synopsis' | 'worldSetting' | 'plotMainline' | 'plotOutline' | 'characters'
    >,
    chunkIndex: number,
    totalChunks: number,
    chunkText: string,
  ): Promise<{ payload: OutlineUpdatePayload; raw: string }> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(
      existing,
      chunkIndex,
      totalChunks,
      chunkText,
    );

    this.logger.log(
      `调用大模型更新大纲：chunk ${chunkIndex}/${totalChunks}，原文 ${chunkText.length} 字`,
    );

    const completion = await this.openaiService.client.chat.completions.create({
      model: this.openaiService.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      // DeepSeek 支持 json_object 强制返回 JSON
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const raw = completion.choices?.[0]?.message?.content ?? '';
    const payload = this.parsePayload(raw);

    return { payload, raw };
  }

  /**
   * 系统提示：明确角色与输出契约
   */
  private buildSystemPrompt(): string {
    return [
      '你是一位资深小说编辑助手。',
      '用户会分多次向你投喂同一本小说的连续片段，你需要在"已知大纲"的基础上，结合"新片段"进行增量更新，产出一份新的完整大纲。',
      '硬性规则：',
      '1. 不要丢弃已有大纲中的关键信息，除非新片段与之明确冲突（此时以新片段为准并在 plotOutline 中注明修订）。',
      '2. 如果新片段未涉及某字段，就保留原值。',
      '3. 人物表按人物名去重合并，若同一人物有新设定/新关系，就补充/修正该人物的字段。',
      '4. 只输出 JSON，字段严格如下（不得增删字段）：',
      '{',
      '  "synopsis": "故事简介",',
      '  "worldSetting": "世界观设定",',
      '  "plotMainline": "主线剧情（高层脉络）",',
      '  "plotOutline": "分段/分章剧情大纲",',
      '  "characters": [{"name":"","identity":"","personality":"","goals":"","traits":"","relations":""}]',
      '}',
      '5. 所有字段必须是字符串或字符串数组，不要使用 null。',
    ].join('\n');
  }

  /**
   * 用户提示：装配「已知大纲 + 新片段」
   */
  private buildUserPrompt(
    existing: Pick<
      NovelOutline,
      'synopsis' | 'worldSetting' | 'plotMainline' | 'plotOutline' | 'characters'
    >,
    chunkIndex: number,
    totalChunks: number,
    chunkText: string,
  ): string {
    const existingJson = JSON.stringify(
      {
        synopsis: existing.synopsis || '',
        worldSetting: existing.worldSetting || '',
        plotMainline: existing.plotMainline || '',
        plotOutline: existing.plotOutline || '',
        characters: existing.characters || [],
      },
      null,
      2,
    );

    return [
      `【已知大纲（JSON）】`,
      existingJson,
      '',
      `【新片段（第 ${chunkIndex} / ${totalChunks} 块）】`,
      chunkText,
      '',
      '请基于以上"已知大纲"和"新片段"，输出更新后的完整大纲 JSON。只输出 JSON，不要任何解释文字。',
    ].join('\n');
  }

  /**
   * 解析大模型返回的 JSON，失败时抛出可读错误
   */
  private parsePayload(raw: string): OutlineUpdatePayload {
    if (!raw) throw new Error('大模型返回内容为空');

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      // 尝试从文本中抠出第一个 JSON 对象（兜底）
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) {
        throw new Error(`无法解析大模型返回的 JSON：${(err as Error).message}`);
      }
      parsed = JSON.parse(match[0]);
    }

    // 强制字段归一化，防止缺字段导致后续写库报错
    const safeStr = (v: any) => (typeof v === 'string' ? v : '');
    const characters: OutlineCharacter[] = Array.isArray(parsed.characters)
      ? parsed.characters
          .filter((c: any) => c && typeof c.name === 'string' && c.name.trim())
          .map((c: any) => ({
            name: String(c.name).trim(),
            identity: safeStr(c.identity),
            personality: safeStr(c.personality),
            goals: safeStr(c.goals),
            traits: safeStr(c.traits),
            relations: safeStr(c.relations),
          }))
      : [];

    return {
      synopsis: safeStr(parsed.synopsis),
      worldSetting: safeStr(parsed.worldSetting),
      plotMainline: safeStr(parsed.plotMainline),
      plotOutline: safeStr(parsed.plotOutline),
      characters,
    };
  }
}
