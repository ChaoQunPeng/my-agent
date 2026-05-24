import { Injectable, Logger } from '@nestjs/common';
import { OpenaiService } from './openai.service';

export interface StructuredStringField<T extends string> {
  key: T;
  label: string;
  instruction: string;
}

@Injectable()
export class StructuredConsolidationService {
  private readonly logger = new Logger(StructuredConsolidationService.name);

  constructor(private readonly openaiService: OpenaiService) {}

  async consolidateStringListFields<T extends string>(params: {
    entityName: string;
    fields: StructuredStringField<T>[];
    rawData: Partial<Record<T, unknown>>;
    signal?: AbortSignal;
    maxAttempts?: number;
  }): Promise<Record<T, string[]>> {
    const normalized = this.normalizeStructuredStringRecord(
      params.fields,
      params.rawData,
    );
    if (!this.hasStructuredValues(normalized)) {
      return normalized;
    }

    const fieldRules = params.fields
      .map(
        (field) =>
          `- ${field.key}：${field.label}。${field.instruction} 无法确认时输出空数组。`,
      )
      .join('\n');

    const outputExample = JSON.stringify(
      params.fields.reduce(
        (acc, field) => {
          acc[field.key] = [];
          return acc;
        },
        {} as Record<T, string[]>,
      ),
      null,
      2,
    );

    const system = `
你是结构化知识归并助手，只负责把同一主题下的碎片化短句整理成稳定、去重、可复用的 JSON。

严格规则：
- 只能基于输入内容整理，禁止补充原文中未明确出现的信息
- 需要合并重复、近义改写、不同角度但语义一致的描述
- 对多次补充的信息，保留更完整、更稳定的一条或少量几条
- 输出尽量简洁，优先使用短句和短标签
- 每个字段必须输出为字符串数组
- 保持字段名完全不变
- 输出必须是合法 JSON，不要输出解释文字

字段要求：
${fieldRules}

输出格式必须严格如下：
${outputExample}
`;

    const user = `
归并主题：${params.entityName}

第一轮抽取结果（同一字段中可能包含重复、补充、不同角度描述）：
${JSON.stringify(normalized, null, 2)}
`;

    const response = await this.callLLM<Record<string, unknown>>({
      system,
      user,
      signal: params.signal,
      maxAttempts: params.maxAttempts ?? 2,
    });

    return this.normalizeStructuredStringRecord(
      params.fields,
      this.pickStructuredPayload(response, params.fields),
    );
  }

  private normalizeStructuredStringRecord<T extends string>(
    fields: StructuredStringField<T>[],
    payload?: Partial<Record<T, unknown>> | Record<string, unknown> | null,
  ): Record<T, string[]> {
    const source = (payload || {}) as Record<string, unknown>;
    const output = {} as Record<T, string[]>;

    for (const field of fields) {
      output[field.key] = this.uniqueStrings(this.toStringArray(source[field.key]));
    }

    return output;
  }

  private hasStructuredValues(record: Record<string, string[]>): boolean {
    return Object.values(record).some((items) => items.length > 0);
  }

  private pickStructuredPayload<T extends string>(
    root: unknown,
    fields: StructuredStringField<T>[],
  ): Record<string, unknown> {
    if (!root || typeof root !== 'object') {
      return {};
    }

    const record = root as Record<string, unknown>;
    const hasTopLevelFields = fields.some((field) => field.key in record);
    if (hasTopLevelFields) {
      return record;
    }

    for (const key of ['result', 'data', 'merged', 'worldView']) {
      const nested = record[key];
      if (nested && typeof nested === 'object') {
        return nested as Record<string, unknown>;
      }
    }

    return record;
  }

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
          `结构化归并 LLM 调用失败，第 ${attempt}/${maxAttempts} 次，将重试：${error.message}`,
        );
        await this.sleep(600 * attempt, params.signal);
      }
    }

    throw new Error(
      `结构化归并 LLM 调用失败，已尝试 ${maxAttempts} 次: ${lastError?.message ?? '未知错误'}`,
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

  private normalize(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private uniqueStrings(values: unknown[]): string[] {
    const seen = new Set<string>();
    const output: string[] = [];

    for (const value of values) {
      const text = this.normalize(value);
      if (!text || seen.has(text)) continue;
      seen.add(text);
      output.push(text);
    }

    return output;
  }

  private toStringArray(value: unknown): string[] {
    if (Array.isArray(value)) return this.uniqueStrings(value);
    const text = this.normalize(value);
    return text ? [text] : [];
  }
}
