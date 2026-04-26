import { Injectable, Logger } from '@nestjs/common';
import { OpenaiService } from '../../shared/openai/openai.service';
import { NovelOutline, OutlineCharacter } from './schemas/novel-outline.schema';

/**
 * 结构变更为“增量更新负载”
 */
export interface OutlineUpdatePayload {
  synopsis: string;
  worldSetting: string;
  plotMainline: string;
  newPlotSegments: string; // 关键：改为返回本段新剧情
  characters: OutlineCharacter[];
}

@Injectable()
export class OutlineGeneratorService {
  private readonly logger = new Logger(OutlineGeneratorService.name);

  constructor(private readonly openaiService: OpenaiService) {}

  async updateOutlineWithChunk(
    existing: Pick<
      NovelOutline,
      | 'synopsis'
      | 'worldSetting'
      | 'plotMainline'
      | 'plotOutline'
      | 'characters'
    >,
    chunkIndex: number,
    totalChunks: number,
    chunkText: string,
    signal?: AbortSignal,
  ): Promise<{ payload: OutlineUpdatePayload; raw: string }> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(
      existing,
      chunkIndex,
      totalChunks,
      chunkText,
    );

    const completion = await this.openaiService.client.chat.completions.create(
      {
        model: this.openaiService.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 2500, // 增量更新通常不会超过此长度
      },
      { signal },
    );

    const raw = completion.choices?.[0]?.message?.content ?? '';
    const payload = this.parsePayload(raw);

    return { payload, raw };
  }

  private buildSystemPrompt(): string {
    return [
      '你是一位资深小说编辑助手。你需要阅读小说片段，并提取相关的大纲更新信息。',
      '请基于"背景信息"和"新片段"，仅输出【增量更新】部分：',
      '1. synopsis/worldSetting/plotMainline：如果新片段导致这些全局设定有重大更新或修正，请输出完整更新后的文本；否则保留原样。',
      '2. newPlotSegments：提取本片段发生的剧情概要（本段剧情本身），不要输出之前已有的剧情。',
      '3. characters：识别本片段中出现的所有人物。如果角色已存在，请更新其关系和特征；如果是新角色，请添加。',
      '硬性要求：只输出 JSON，严禁任何解释文字。',
    ].join('\n');
  }

  private buildUserPrompt(
    existing: any,
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
      plotMainline: existing.plotMainline || '',
      recentPlotContext: plotRef,
      knownCharacterNames: (existing.characters || []).map((c: any) => c.name),
    });

    return [
      `【背景参考（JSON）】`,
      contextJson,
      '',
      `【新片段（第 ${index} / ${total} 块）】`,
      text,
      '',
      '请根据新片段输出 JSON：',
      '{',
      '  "synopsis": "更新后的简介",',
      '  "worldSetting": "更新后的世界观",',
      '  "plotMainline": "更新后的主线",',
      '  "newPlotSegments": "仅本片段的详细剧情",',
      '  "characters": [{"name":"","identity":"","personality":"","goals":"","traits":"","relations":""}]',
      '}',
    ].join('\n');
  }

  private parsePayload(raw: string): OutlineUpdatePayload {
    if (!raw) throw new Error('大模型返回内容为空');

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
      plotMainline: safeStr(parsed.plotMainline),
      newPlotSegments: safeStr(parsed.newPlotSegments || parsed.plotOutline),
      characters: Array.isArray(parsed.characters) ? parsed.characters : [],
    };
  }
}
