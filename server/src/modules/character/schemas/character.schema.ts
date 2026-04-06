import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CharacterDocument = Character & Document;

@Schema({ timestamps: true })
export class Character {
  // 人物唯一标识ID
  @Prop({ required: true, unique: true })
  characterId: string;

  // 姓名：真实姓名或代号
  @Prop({ required: true })
  name: string;

  // 性别：0-未知, 1-男, 2-女
  @Prop({ required: true })
  gender: number;

  // 年龄
  @Prop({ required: true })
  age: number;

  // 外貌：侧重于神态和标志性特征（可选）
  @Prop()
  appearance?: string;

  // 职业：强调描述职业对思维方式的影响
  @Prop({ required: true })
  profession: string;

  // 性格概述：矛盾点和内在驱动力的文字描述
  @Prop({ required: true })
  personalityOverview: string;

  // 性格标签：关键性格锚点 (3-5个)
  @Prop({ required: true, type: [String] })
  personalityTags: string[];

  // 行为描述：核心是解决问题的逻辑、应对压力的反应（可选）
  @Prop({ type: [String] })
  behaviorDescriptions?: string[];

  // 注意：不在Character中存储sessionIds，而是在Session中存储characterId
  // 这样符合"一个会话只能对应一个人物"的业务逻辑
}

export const CharacterSchema = SchemaFactory.createForClass(Character);
