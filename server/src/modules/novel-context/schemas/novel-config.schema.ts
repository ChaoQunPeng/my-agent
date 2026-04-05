import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NovelConfigDocument = NovelConfig & Document;

@Schema({
  timestamps: { updatedAt: 'updated_at' },
  collection: 'novel_configs',
})
export class NovelConfig {
  // 小说编码（唯一标识一部小说）
  @Prop({ required: true, index: true })
  novelCode: string;

  // 会话分类（与路由的 sessionCategory 对应）
  @Prop({ required: false, index: true })
  sessionCategory: string;

  // 可选关联的会话ID（用于追踪最后编辑的会话）
  @Prop({ required: false })
  sessionId?: string;

  // --- 2. 黄金四角 (核心盘) ---
  @Prop({ required: false })
  synopsis: string;

  @Prop()
  world_background: string;

  @Prop()
  world_logic_rules: string;

  @Prop()
  world_geography: string;

  @Prop({ required: false })
  main_outline: string;

  @Prop({ default: '通俗网文风格' })
  writing_tone: string;

  @Prop({
    type: [
      {
        name: { type: String, required: false },
        identity: String,
        personality: String,
        goals: String,
        traits: String,
      },
    ],
    default: [],
  })
  characters_list: Array<{
    name: string;
    identity?: string;
    personality?: string;
    goals?: string;
    traits?: string;
  }>;

  // --- 3. 写作指令 (规范输出) ---
  @Prop({
    enum: ['第一人称', '第三人称有限视角', '第三人称上帝视角'],
    default: '第三人称有限视角',
  })
  writing_perspective: string;

  @Prop({ default: 2000 })
  target_word_count: number;

  // --- 4. 禁止事项 (避雷针) ---
  @Prop({ type: [String], default: [] })
  avoid_plots: string[];

  @Prop({ type: [String], default: [] })
  forbidden_words: string[];

  @Prop()
  logic_redlines: string;

  // --- 5. 阶段性目标 (进度推进) ---
  @Prop()
  volume_goal: string;

  @Prop()
  chapter_goal: string;

  // --- 6. 系统元数据 ---
  @Prop({ default: Date.now })
  updated_at: Date;
}

export const NovelConfigSchema = SchemaFactory.createForClass(NovelConfig);
