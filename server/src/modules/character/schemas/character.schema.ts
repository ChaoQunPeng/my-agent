import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CharacterDocument = Character & Document;

// 性别枚举
export enum Gender {
  UNKNOWN = 0,
  MALE = 1,
  FEMALE = 2,
  OTHER = 3,
}

@Schema({
  timestamps: true, // 记录创建/更新时间，方便追踪“行为图谱”的扩充历程
  collection: 'characters',
})
export class Character {
  // 姓名：唯一的必填项
  @Prop({ required: true, trim: true, index: true })
  name!: string;

  // 性别：可选，默认未知
  @Prop({ enum: Gender, default: Gender.UNKNOWN })
  gender?: number;

  // 出生年月：可选
  @Prop()
  birthday?: Date;

  // 外貌：可选
  @Prop({ trim: true })
  appearance?: string;

  // 职业：可选
  @Prop({ trim: true })
  profession?: string;

  // 性格描述：可选
  @Prop({ trim: true })
  personalityDescription?: string;

  // 与我的关系：可选
  @Prop({ trim: true })
  relation?: string;

  /**
   * 行为图谱：可选，默认为空数组
   * 随着互动的深入，你可以不断 push 新的行为描述到这个数组里
   */
  @Prop({ type: [String], default: [] })
  behaviorAtlas?: string[];
}

export const CharacterSchema = SchemaFactory.createForClass(Character);

// 虚拟属性：仅在有生日时计算年龄
CharacterSchema.virtual('age').get(function () {
  if (!this.birthday) return null;
  const now = new Date();
  const diff = now.getTime() - this.birthday.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
});
