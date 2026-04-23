import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NovelOutlineDocument = NovelOutline & Document;

/**
 * 大纲人物条目
 * 注意：与 novel-context 中的 charactersList 字段风格保持一致，便于后续合并到 NovelConfig
 */
export interface OutlineCharacter {
  name: string;
  identity?: string;
  personality?: string;
  goals?: string;
  traits?: string;
  // 与其他角色关系（自由文本）
  relations?: string;
}

/**
 * 小说大纲（由拆分后内容逐块整理生成）
 * 一个 novelCode 对应一份大纲，每次新的 chunk 处理完都会整体 upsert 覆盖此文档
 */
@Schema({
  timestamps: true,
  collection: 'novel_outlines',
})
export class NovelOutline {
  @Prop({ required: true, unique: true, index: true, comment: '小说唯一识别码' })
  novelCode: string;

  // 最近一次关联的任务ID，便于溯源
  @Prop({ default: '', comment: '最近一次生成该大纲的任务ID' })
  lastJobId: string;

  // 故事简介 / 核心梗
  @Prop({ default: '', comment: '故事简介' })
  synopsis: string;

  // 世界观 / 背景设定
  @Prop({ default: '', comment: '世界观与背景设定' })
  worldSetting: string;

  // 主线剧情（高层脉络）
  @Prop({ default: '', comment: '主线剧情' })
  plotMainline: string;

  // 剧情大纲（章节级/段落级）
  @Prop({ default: '', comment: '分段剧情大纲' })
  plotOutline: string;

  // 人物列表
  @Prop({
    type: [
      {
        name: { type: String, required: true },
        identity: { type: String },
        personality: { type: String },
        goals: { type: String },
        traits: { type: String },
        relations: { type: String },
      },
    ],
    default: [],
    comment: '人物设定列表',
  })
  characters: OutlineCharacter[];

  // 原始 LLM 返回文本（JSON 解析失败时作为兜底，便于排查）
  @Prop({ default: '', comment: '最近一次大模型返回的原始文本' })
  rawLastResponse: string;
}

export const NovelOutlineSchema = SchemaFactory.createForClass(NovelOutline);
