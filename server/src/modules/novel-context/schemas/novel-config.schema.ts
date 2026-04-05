import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NovelConfigDocument = NovelConfig & Document;

@Schema({
  timestamps: { updatedAt: 'updatedAt' },
  collection: 'novel_configs',
})
export class NovelConfig {
  @Prop({
    required: true,
    index: true,
    comment: '唯一识别码，关联具体小说作品',
  })
  novelCode: string;

  @Prop({ required: false, comment: '故事简介：核心梗、主要冲突与看点' })
  synopsis: string;

  @Prop({ comment: '时代背景：如古代修仙、高魔奇幻、赛博朋克等' })
  worldBackground: string;

  @Prop({ comment: '力量与逻辑体系：如灵气等级、魔法咒语、物理常数、社会规则' })
  worldLogicRules: string;

  @Prop({ comment: '地理与势力分布：如大陆板块、国家领土、宗门家族分布' })
  worldGeography: string;

  @Prop({ required: false, comment: '全书粗纲：从开端到结局的核心剧情脉络' })
  mainOutline: string;

  @Prop({
    type: [
      {
        name: { type: String, required: true, comment: '角色姓名' },
        identity: { type: String, comment: '身份标签：如落魄少年、隐世魔尊' },
        personality: {
          type: String,
          comment: '性格特征：如稳健、腹黑、重情重义',
        },
        goals: { type: String, comment: '核心动机：角色最终追求的东西' },
        traits: {
          type: String,
          comment: '外部特征：外貌描写或特定习惯动作/口癖',
        },
      },
    ],
    default: [],
    comment: '核心角色库',
  })
  charactersList: Array<{
    name: string;
    identity?: string;
    personality?: string;
    goals?: string;
    traits?: string;
  }>;

  // --- 写作指令 (生成控制) ---
  @Prop({
    enum: ['第一人称', '第三人称有限视角', '第三人称上帝视角'],
    default: '第三人称有限视角',
    comment: '叙事视角：控制 AI 观察故事的角度',
  })
  writingPerspective: string;

  @Prop({
    default: '通俗网文风格',
    comment: '文风基调：如幽默风趣、硬核冷峻、古风雅致',
  })
  writingTone: string;

  @Prop({ default: 2000, comment: '单章建议字数：引导 AI 生成内容的长度控制' })
  targetWordCount: number;

  @Prop({
    type: [String],
    default: [],
    comment: '避雷剧情：明确禁止 AI 生成的桥段（如虐主、绿帽等）',
  })
  avoidPlots: string[];

  @Prop({
    type: [String],
    default: [],
    comment: '禁忌词汇：严禁在生成文本中出现的特定敏感词',
  })
  forbiddenWords: string[];
  @Prop({ comment: '逻辑红线：AI 必须遵守的硬性逻辑，如"主角绝对不能杀人"' })
  logicRedlines: string;

  // --- 系统元数据 ---
  @Prop({ default: Date.now, comment: '最后一次同步或更新设定的时间' })
  updatedAt: Date;
}

export const NovelConfigSchema = SchemaFactory.createForClass(NovelConfig);
