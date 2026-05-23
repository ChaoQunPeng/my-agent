import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OpenaiService } from '../../shared/openai/openai.service';
import { normalize, toStringArray, uniqueStrings } from './outline-merge.utils';
import {
  NovelOutline,
  NovelOutlineDocument,
  OutlineCharacter,
  OutlineEvent,
  OutlineWorldView,
} from './schemas/novel-outline.schema';
import {
  NovelOutlineCompressed,
  NovelOutlineCompressedDocument,
} from './schemas/novel-outline-compressed.schema';

const EVENT_BATCH_SIZE = 20;

type CompressedPayload = Pick<
  NovelOutlineCompressed,
  'novelCode' | 'lastJobId' | 'worldView' | 'characters' | 'events'
>;

type RawCompressedRecord = Record<string, unknown> & {
  _id?: unknown;
  novelCode?: unknown;
  lastJobId?: unknown;
  worldView?: unknown;
  characters?: unknown;
  events?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

@Injectable()
export class OutlineCompressionService {
  private readonly logger = new Logger(OutlineCompressionService.name);

  constructor(
    @InjectModel(NovelOutline.name)
    private readonly outlineModel: Model<NovelOutlineDocument>,
    @InjectModel(NovelOutlineCompressed.name)
    private readonly compressedModel: Model<NovelOutlineCompressedDocument>,
    private readonly openaiService: OpenaiService,
  ) {}

  async findByNovelCode(
    novelCode: string,
  ): Promise<NovelOutlineCompressed | null> {
    const normalizedNovelCode = novelCode?.trim();
    if (!normalizedNovelCode) {
      throw new BadRequestException('novelCode 不能为空');
    }

    const raw = (await this.compressedModel.collection.findOne({
      novelCode: normalizedNovelCode,
    })) as RawCompressedRecord | null;
    if (!raw) return null;

    const { data, changed } = this.normalizeStoredCompressedRecord(raw);
    if (changed) {
      await this.compressedModel
        .updateOne(
          { novelCode: normalizedNovelCode },
          { $set: this.toStoredCompressedPayload(data) },
        )
        .exec();
    }

    return data as NovelOutlineCompressed;
  }

  async buildFromNovelCode(novelCode: string): Promise<NovelOutlineCompressed> {
    const normalizedNovelCode = novelCode?.trim();
    if (!normalizedNovelCode) {
      throw new BadRequestException('novelCode 不能为空');
    }

    const outline = await this.outlineModel
      .findOne({ novelCode: normalizedNovelCode })
      .lean()
      .exec();
    if (!outline) {
      throw new NotFoundException(`未找到小说 ${normalizedNovelCode} 对应的大纲`);
    }

    const compressed = await this.buildCompressedPayload(outline);
    const doc = await this.compressedModel
      .findOneAndUpdate(
        { novelCode: normalizedNovelCode },
        { $set: this.toStoredCompressedPayload(compressed) },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        },
      )
      .exec();

    return doc!;
  }

  private async buildCompressedPayload(
    outline: Pick<
      NovelOutline,
      'novelCode' | 'lastJobId' | 'worldView' | 'characters' | 'events'
    >,
  ): Promise<CompressedPayload> {
    try {
      return await this.compressWithLlm(outline);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `compressed 层 LLM 压缩失败，回退到本地压缩: novelCode=${outline.novelCode}, error=${message}`,
      );
      return this.buildFallbackCompressed(outline);
    }
  }

  private async compressWithLlm(
    outline: Pick<
      NovelOutline,
      'novelCode' | 'lastJobId' | 'worldView' | 'characters' | 'events'
    >,
  ): Promise<CompressedPayload> {
    const nameMap = this.buildCharacterNameMap(outline.characters || []);
    const worldView = await this.compressWorldView(outline.worldView || {});

    const characters: OutlineCharacter[] = [];
    for (const character of outline.characters || []) {
      const compressed = await this.compressCharacter(character, nameMap);
      if (compressed) {
        characters.push(compressed);
      }
    }

    const events: OutlineEvent[] = [];
    const allEvents = outline.events || [];
    for (let start = 0; start < allEvents.length; start += EVENT_BATCH_SIZE) {
      const batch = allEvents.slice(start, start + EVENT_BATCH_SIZE);
      const compressedBatch = await this.compressEventBatch(batch, nameMap);
      events.push(...compressedBatch);
    }

    return {
      novelCode: outline.novelCode,
      lastJobId: normalize(outline.lastJobId),
      worldView,
      characters: this.deduplicateCharacters(characters, nameMap),
      events: this.deduplicateEvents(events, nameMap),
    };
  }

  private buildFallbackCompressed(
    outline: Pick<
      NovelOutline,
      'novelCode' | 'lastJobId' | 'worldView' | 'characters' | 'events'
    >,
  ): CompressedPayload {
    const nameMap = this.buildCharacterNameMap(outline.characters || []);

    return {
      novelCode: outline.novelCode,
      lastJobId: normalize(outline.lastJobId),
      worldView: this.fallbackWorldView(outline.worldView || {}),
      characters: this.deduplicateCharacters(
        (outline.characters || [])
          .map((character) => this.fallbackCharacter(character, nameMap))
          .filter((character): character is OutlineCharacter => Boolean(character)),
        nameMap,
      ),
      events: this.deduplicateEvents(
        (outline.events || [])
          .map((event) => this.fallbackEvent(event, nameMap))
          .filter((event): event is OutlineEvent => Boolean(event)),
        nameMap,
      ),
    };
  }

  private async compressWorldView(
    worldView: OutlineWorldView,
  ): Promise<OutlineWorldView> {
    const res = await this.callLLM<{
      worldView?: Record<string, unknown>;
      compressedWorldView?: Record<string, unknown>;
    }>({
      system: `
你是小说知识压缩引擎，只负责压缩【世界观】。

严格规则：
- 输出字段必须与输入层保持一致：worldType, summary, socialStructure, coreRules
- 只压缩内容，不要改字段名
- 去掉冗余、修辞、重复语义
- 尽量统一术语，保留事实
- 每个字段都输出字符串数组；没有内容就输出空数组
- 只输出合法 JSON，不要输出解释文字
`,
      user: `
请压缩以下 worldView，并保持字段结构与原始层一致。

输入：
${JSON.stringify(worldView)}

输出格式：
{
  "worldView": {
    "worldType": ["世界类型"],
    "summary": ["压缩后的世界设定"],
    "socialStructure": ["压缩后的组织/社会结构"],
    "coreRules": ["压缩后的核心规则"]
  }
}
`,
    });

    return this.normalizeOutlineWorldView(
      (res.worldView || res.compressedWorldView || {}) as Record<
        string,
        unknown
      >,
    );
  }

  private async compressCharacter(
    character: OutlineCharacter,
    nameMap: Map<string, string>,
  ): Promise<OutlineCharacter | null> {
    const name = normalize(character.name);
    if (!name) return null;

    const res = await this.callLLM<{
      character?: Record<string, unknown>;
      compressedCharacter?: Record<string, unknown>;
    }>({
      system: `
你是小说知识压缩引擎，只负责压缩【单个角色】。

严格规则：
- 输出字段必须与输入层保持一致：name, aliases, aliasCandidates, identity, personality, goals, traits, relations
- 只压缩内容，不要改字段名
- 去掉重复语义和文学化描述
- 关系字段仍输出字符串数组，但要改写为更短、更稳定的事实表达
- 人名尽量使用标准名称
- 不要编造新事实
- 只输出合法 JSON，不要输出解释
`,
      user: `
已知角色标准名（用于归一化关系中的人名）：
${JSON.stringify(Array.from(new Set(nameMap.values())))}

输入角色：
${JSON.stringify(character)}

输出格式：
{
  "character": {
    "name": "主名称",
    "aliases": ["别名"],
    "aliasCandidates": ["待确认别名"],
    "identity": ["身份"],
    "personality": ["性格"],
    "goals": ["目标"],
    "traits": ["特征"],
    "relations": ["压缩后的关系表达"]
  }
}
`,
    });

    return this.normalizeOutlineCharacter(
      (res.character || res.compressedCharacter || {}) as Record<
        string,
        unknown
      >,
      nameMap,
      name,
    );
  }

  private async compressEventBatch(
    events: OutlineEvent[],
    nameMap: Map<string, string>,
  ): Promise<OutlineEvent[]> {
    if (!events.length) return [];

    const res = await this.callLLM<{
      events?: Array<Record<string, unknown>>;
      compressedEvents?: Array<Record<string, unknown>>;
    }>({
      system: `
你是小说知识压缩引擎，只负责压缩【剧情事件】。

严格规则：
- 输出字段必须与输入层保持一致：title, summary, characters, chunkIndex
- 只压缩内容，不要改字段名
- summary 输出字符串数组，但每条都要短、稳、去重
- 保留关键事实和人物，不要编造
- characters 尽量使用标准名称
- chunkIndex 沿用原始数据
- 只输出合法 JSON，不要输出解释
`,
      user: `
已知角色标准名：
${JSON.stringify(Array.from(new Set(nameMap.values())))}

输入事件：
${JSON.stringify(events)}

输出格式：
{
  "events": [
    {
      "title": "事件标题",
      "summary": ["压缩后的事件描述"],
      "characters": ["角色名"],
      "chunkIndex": 1
    }
  ]
}
`,
    });

    const payload = res.events || res.compressedEvents || [];
    return payload
      .map((event, index) =>
        this.normalizeOutlineEvent(event, nameMap, events[index]?.chunkIndex),
      )
      .filter((event): event is OutlineEvent => Boolean(event));
  }

  private fallbackWorldView(worldView: OutlineWorldView): OutlineWorldView {
    return this.normalizeOutlineWorldView({
      worldType: worldView.worldType || [],
      summary: worldView.summary || [],
      socialStructure: worldView.socialStructure || [],
      coreRules: worldView.coreRules || [],
    });
  }

  private fallbackCharacter(
    character: OutlineCharacter,
    nameMap: Map<string, string>,
  ): OutlineCharacter | null {
    return this.normalizeOutlineCharacter(
      character as unknown as Record<string, unknown>,
      nameMap,
    );
  }

  private fallbackEvent(
    event: OutlineEvent,
    nameMap: Map<string, string>,
  ): OutlineEvent | null {
    return this.normalizeOutlineEvent(
      event as unknown as Record<string, unknown>,
      nameMap,
      event.chunkIndex,
    );
  }

  private normalizeOutlineWorldView(
    raw: Record<string, unknown>,
  ): OutlineWorldView {
    const worldType = uniqueStrings([
      ...toStringArray(raw.worldType),
      ...toStringArray(raw.genre),
    ]);
    const summary = uniqueStrings([
      ...toStringArray(raw.summary),
      ...toStringArray(raw.locations),
      ...toStringArray(raw.powerSystem),
      ...toStringArray(raw.era),
    ]);
    const socialStructure = uniqueStrings([
      ...toStringArray(raw.socialStructure),
      ...toStringArray(raw.organizations),
      ...toStringArray(raw.races),
    ]);
    const coreRules = uniqueStrings([
      ...toStringArray(raw.coreRules),
      ...toStringArray(raw.rules),
    ]);

    return {
      worldType,
      summary,
      socialStructure,
      coreRules,
    };
  }

  private normalizeOutlineCharacter(
    raw: Record<string, unknown>,
    nameMap: Map<string, string>,
    fallbackName = '',
  ): OutlineCharacter | null {
    const name =
      this.resolveCharacterName(normalize(raw.name), nameMap) ||
      this.resolveCharacterName(normalize(raw.canonicalName), nameMap) ||
      fallbackName;
    if (!name) return null;

    const aliases = uniqueStrings([
      ...toStringArray(raw.aliases),
      ...toStringArray(raw.alias),
    ]).filter((alias) => alias !== name);
    const aliasCandidates = uniqueStrings([
      ...toStringArray(raw.aliasCandidates),
    ]).filter(
      (candidate) => candidate !== name && !aliases.includes(candidate),
    );

    const identity = uniqueStrings([...toStringArray(raw.identity)]);
    const personality = uniqueStrings([...toStringArray(raw.personality)]);
    const goals = uniqueStrings([...toStringArray(raw.goals)]);
    const traits = uniqueStrings([...toStringArray(raw.traits)]);
    const relations = this.normalizeRelationStrings(raw.relations, nameMap, name);

    return {
      name,
      aliases,
      aliasCandidates,
      identity,
      personality,
      goals,
      traits,
      relations,
    };
  }

  private normalizeOutlineEvent(
    raw: Record<string, unknown>,
    nameMap: Map<string, string>,
    fallbackChunkIndex?: number,
  ): OutlineEvent | null {
    const title = normalize(raw.title);
    const summary = uniqueStrings([
      ...toStringArray(raw.summary),
      ...toStringArray(raw.desc),
      ...toStringArray(raw.description),
    ]);
    const characters = uniqueStrings(
      toStringArray(raw.characters).map(
        (name) => this.resolveCharacterName(name, nameMap) || name,
      ),
    );
    const chunkIndex = this.normalizeChunkIndex(raw.chunkIndex, fallbackChunkIndex);

    if (!title && !summary.length) return null;

    return {
      title: title || summary[0],
      summary,
      characters,
      ...(chunkIndex !== undefined ? { chunkIndex } : {}),
    };
  }

  private normalizeRelationStrings(
    rawRelations: unknown,
    nameMap: Map<string, string>,
    selfName: string,
  ): string[] {
    if (!Array.isArray(rawRelations)) return [];

    const output: string[] = [];

    for (const raw of rawRelations) {
      if (typeof raw === 'string') {
        const normalized = this.normalizeRelationText(raw, nameMap, selfName);
        if (normalized) output.push(normalized);
        continue;
      }

      if (!raw || typeof raw !== 'object') continue;
      const record = raw as Record<string, unknown>;
      const target =
        this.resolveCharacterName(normalize(record.target), nameMap) ||
        this.resolveTargetFromText(
          normalize(record.desc) || normalize(record.description),
          nameMap,
          selfName,
        );
      const type =
        normalize(record.type) ||
        this.inferRelationType(
          normalize(record.desc) || normalize(record.description),
        );
      const desc = normalize(record.desc) || normalize(record.description);
      const text = this.stringifyRelation(target, type, desc, selfName);
      if (text) output.push(text);
    }

    return uniqueStrings(output);
  }

  private normalizeRelationText(
    text: string,
    nameMap: Map<string, string>,
    selfName: string,
  ): string {
    const desc = normalize(text);
    if (!desc) return '';

    const target = this.resolveTargetFromText(desc, nameMap, selfName);
    const type = this.inferRelationType(desc);

    return this.stringifyRelation(target, type, desc, selfName);
  }

  private stringifyRelation(
    target: string | null,
    type: string,
    desc: string,
    selfName: string,
  ): string {
    if (target && target !== selfName && type) {
      return `${type} ${target}`;
    }
    return desc;
  }

  private buildCharacterNameMap(
    characters: OutlineCharacter[],
  ): Map<string, string> {
    const map = new Map<string, string>();

    for (const character of characters) {
      const canonicalName = normalize(character.name);
      if (!canonicalName) continue;

      const variants = [
        canonicalName,
        ...(character.aliases || []),
        ...(character.aliasCandidates || []),
      ];

      for (const variant of variants) {
        const name = normalize(variant);
        if (!name || map.has(name)) continue;
        map.set(name, canonicalName);
      }
    }

    return map;
  }

  private resolveCharacterName(
    rawName: string,
    nameMap: Map<string, string>,
  ): string {
    if (!rawName) return '';
    return nameMap.get(rawName) || rawName;
  }

  private resolveTargetFromText(
    text: string,
    nameMap: Map<string, string>,
    selfName: string,
  ): string | null {
    if (!text) return null;

    const candidates = Array.from(nameMap.entries())
      .filter(([, canonicalName]) => canonicalName !== selfName)
      .sort((a, b) => b[0].length - a[0].length);

    for (const [name, canonicalName] of candidates) {
      if (name && text.includes(name)) {
        return canonicalName;
      }
    }

    return null;
  }

  private inferRelationType(text: string): string {
    const relationMap: Array<[string, string]> = [
      ['暗恋', '暗恋'],
      ['喜欢', '喜欢'],
      ['恋人', '恋人'],
      ['情侣', '恋人'],
      ['夫妻', '夫妻'],
      ['婚约', '婚约'],
      ['朋友', '朋友'],
      ['好友', '朋友'],
      ['同学', '同学'],
      ['室友', '室友'],
      ['同伴', '同伴'],
      ['队友', '同伴'],
      ['老师', '师生'],
      ['学生', '师生'],
      ['师父', '师徒'],
      ['徒弟', '师徒'],
      ['上司', '上下级'],
      ['下属', '上下级'],
      ['父亲', '亲属'],
      ['母亲', '亲属'],
      ['哥哥', '亲属'],
      ['姐姐', '亲属'],
      ['弟弟', '亲属'],
      ['妹妹', '亲属'],
      ['叔叔', '亲属'],
      ['婶婶', '亲属'],
      ['仇人', '敌对'],
      ['敌人', '敌对'],
      ['对手', '对手'],
      ['宿敌', '敌对'],
      ['追随', '追随'],
      ['效忠', '效忠'],
      ['保护', '保护'],
      ['救过', '救助'],
    ];

    for (const [keyword, relationType] of relationMap) {
      if (text.includes(keyword)) {
        return relationType;
      }
    }

    return '';
  }

  private deduplicateCharacters(
    characters: OutlineCharacter[],
    nameMap: Map<string, string>,
  ): OutlineCharacter[] {
    const grouped = new Map<string, OutlineCharacter>();

    for (const character of characters) {
      const canonicalName = this.resolveCharacterName(character.name, nameMap);
      const existing = grouped.get(canonicalName);
      if (!existing) {
        grouped.set(canonicalName, {
          name: canonicalName,
          aliases: uniqueStrings(character.aliases || []),
          aliasCandidates: uniqueStrings(character.aliasCandidates || []),
          identity: uniqueStrings(character.identity || []),
          personality: uniqueStrings(character.personality || []),
          goals: uniqueStrings(character.goals || []),
          traits: uniqueStrings(character.traits || []),
          relations: uniqueStrings(character.relations || []),
        });
        continue;
      }

      existing.aliases = uniqueStrings([
        ...(existing.aliases || []),
        ...(character.aliases || []),
      ]).filter((alias) => alias !== canonicalName);
      existing.aliasCandidates = uniqueStrings([
        ...(existing.aliasCandidates || []),
        ...(character.aliasCandidates || []),
      ]).filter(
        (candidate) =>
          candidate !== canonicalName && !existing.aliases?.includes(candidate),
      );
      existing.identity = uniqueStrings([
        ...(existing.identity || []),
        ...(character.identity || []),
      ]);
      existing.personality = uniqueStrings([
        ...(existing.personality || []),
        ...(character.personality || []),
      ]);
      existing.goals = uniqueStrings([
        ...(existing.goals || []),
        ...(character.goals || []),
      ]);
      existing.traits = uniqueStrings([
        ...(existing.traits || []),
        ...(character.traits || []),
      ]);
      existing.relations = uniqueStrings([
        ...(existing.relations || []),
        ...(character.relations || []),
      ]);
    }

    return Array.from(grouped.values()).sort((a, b) =>
      a.name.localeCompare(b.name, 'zh-Hans-CN'),
    );
  }

  private deduplicateEvents(
    events: OutlineEvent[],
    nameMap: Map<string, string>,
  ): OutlineEvent[] {
    const grouped = new Map<string, OutlineEvent>();

    for (const rawEvent of events) {
      const event = this.normalizeOutlineEvent(
        rawEvent as unknown as Record<string, unknown>,
        nameMap,
        rawEvent.chunkIndex,
      );
      if (!event) continue;

      const key = `${event.title}|${(event.summary || []).join('｜')}`;
      const existing = grouped.get(key);
      if (!existing) {
        grouped.set(key, event);
        continue;
      }

      existing.characters = uniqueStrings([
        ...(existing.characters || []),
        ...(event.characters || []),
      ]);
      existing.summary = uniqueStrings([
        ...(existing.summary || []),
        ...(event.summary || []),
      ]);
      if (existing.chunkIndex == null && event.chunkIndex != null) {
        existing.chunkIndex = event.chunkIndex;
      }
    }

    return Array.from(grouped.values());
  }

  private normalizeChunkIndex(
    value: unknown,
    fallback?: number,
  ): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Math.max(0, Math.round(value));
    }
    if (typeof fallback === 'number' && Number.isFinite(fallback)) {
      return Math.max(0, Math.round(fallback));
    }
    return undefined;
  }

  private normalizeStoredCompressedRecord(raw: RawCompressedRecord): {
    data: CompressedPayload & {
      _id?: unknown;
      createdAt?: unknown;
      updatedAt?: unknown;
    };
    changed: boolean;
  } {
    const data = this.normalizeLegacyCompressedRecord(raw);
    const changed = this.isLegacyCompressedRecord(raw);
    return { data, changed };
  }

  private normalizeLegacyCompressedRecord(
    raw: RawCompressedRecord,
  ): CompressedPayload & {
    _id?: unknown;
    createdAt?: unknown;
    updatedAt?: unknown;
  } {
    const worldView = this.normalizeOutlineWorldView(
      ((raw.worldView as Record<string, unknown>) || {}) as Record<
        string,
        unknown
      >,
    );
    const nameMap = this.buildCharacterNameMap(
      this.extractLegacyCharacters(raw.characters),
    );
    const characters = this.deduplicateCharacters(
      this.extractLegacyCharacters(raw.characters).map((character) =>
        this.normalizeOutlineCharacter(
          character as unknown as Record<string, unknown>,
          nameMap,
          normalize(character.name),
        ),
      )
        .filter((character): character is OutlineCharacter => Boolean(character)),
      nameMap,
    );
    const events = this.deduplicateEvents(
      this.extractLegacyEvents(raw.events)
        .map((event) =>
          this.normalizeOutlineEvent(
            event as unknown as Record<string, unknown>,
            nameMap,
            event.chunkIndex,
          ),
        )
        .filter((event): event is OutlineEvent => Boolean(event)),
      nameMap,
    );

    return {
      _id: raw._id,
      novelCode: normalize(raw.novelCode),
      lastJobId: normalize(raw.lastJobId),
      worldView,
      characters,
      events,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }

  private extractLegacyCharacters(raw: unknown): OutlineCharacter[] {
    if (!Array.isArray(raw)) return [];
    return raw
      .map((item): OutlineCharacter | null => {
        if (!item || typeof item !== 'object') return null;
        const record = item as Record<string, unknown>;
        return {
          name:
            normalize(record.name) || normalize(record.canonicalName) || '未命名角色',
          aliases: toStringArray(record.aliases),
          aliasCandidates: toStringArray(record.aliasCandidates),
          identity: toStringArray(record.identity),
          personality: toStringArray(record.personality),
          goals: toStringArray(record.goals),
          traits: toStringArray(record.traits),
          relations: this.normalizeRelationStrings(
            Array.isArray(record.relations) ? record.relations : [],
            new Map<string, string>(),
            normalize(record.name) || normalize(record.canonicalName),
          ),
        } satisfies OutlineCharacter;
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }

  private extractLegacyEvents(raw: unknown): OutlineEvent[] {
    if (!Array.isArray(raw)) return [];
    return raw
      .map((item): OutlineEvent | null => {
        if (!item || typeof item !== 'object') return null;
        const record = item as Record<string, unknown>;
        return {
          title: normalize(record.title) || normalize(record.desc),
          summary: uniqueStrings([
            ...toStringArray(record.summary),
            ...toStringArray(record.desc),
          ]),
          characters: toStringArray(record.characters),
          chunkIndex: this.normalizeChunkIndex(record.chunkIndex, 0),
        } satisfies OutlineEvent;
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }

  private isLegacyCompressedRecord(raw: RawCompressedRecord): boolean {
    const worldView = (raw.worldView || {}) as Record<string, unknown>;
    const characters = Array.isArray(raw.characters) ? raw.characters : [];
    const events = Array.isArray(raw.events) ? raw.events : [];

    return Boolean(
      'genre' in worldView ||
        'era' in worldView ||
        'locations' in worldView ||
        characters.some((item) => {
          if (!item || typeof item !== 'object') return false;
          const record = item as Record<string, unknown>;
          return 'canonicalName' in record;
        }) ||
        events.some((item) => {
          if (!item || typeof item !== 'object') return false;
          const record = item as Record<string, unknown>;
          return 'desc' in record || 'tags' in record || 'importance' in record;
        }),
    );
  }

  private toStoredCompressedPayload(payload: CompressedPayload) {
    return {
      novelCode: payload.novelCode,
      lastJobId: payload.lastJobId,
      worldView: payload.worldView,
      characters: payload.characters,
      events: payload.events,
    };
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
              temperature: 0.2,
              max_tokens: 12000,
            },
            { signal: params.signal },
          );

        const raw = completion.choices?.[0]?.message?.content?.trim() ?? '';
        if (!raw) {
          throw new Error('返回内容为空');
        }

        return JSON.parse(raw) as T;
      } catch (error) {
        const currentError =
          error instanceof Error ? error : new Error(String(error));
        if (currentError.name === 'AbortError' || params.signal?.aborted) {
          throw currentError;
        }

        lastError = currentError;
        if (attempt >= maxAttempts) break;

        this.logger.warn(
          `compressed LLM 调用失败，第 ${attempt}/${maxAttempts} 次，将重试：${currentError.message}`,
        );
        await this.sleep(500 * attempt, params.signal);
      }
    }

    throw new Error(
      `compressed LLM 调用失败，已尝试 ${maxAttempts} 次: ${lastError?.message ?? '未知错误'}`,
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
}
