import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SessionDocument = Session & Document;

/**
 * 会话数据模型
 * 用于存储聊天会话的基本信息和关联的资源
 */
@Schema({ timestamps: true })
export class Session {
  // 会话唯一标识
  @Prop({ required: true, unique: true })
  sessionId!: string;

  // 会话标题
  @Prop({ default: '新会话' })
  title!: string;

  // 会话摘要
  @Prop({ default: '' })
  summary!: string;

  // 资源类型，例如 'character'（角色）
  @Prop({ default: '' })
  type!: string;

  // 资源ID：对应 type 类型的资源ID
  @Prop({ default: '' })
  resourceId!: string;
}

export const SessionSchema = SchemaFactory.createForClass(Session);
