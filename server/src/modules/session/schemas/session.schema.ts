import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SessionDocument = Session & Document;

/**
 * 会话数据模型
 * 用于存储聊天会话的基本信息和模块归属
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

  // 模块标识，用于隔离不同模块的会话
  @Prop({ default: '' })
  moduleKey!: string;

  // 资源标识（如小说ID），用于隔离同一模块下不同资源的会话
  @Prop({ default: '' })
  resourceId!: string;
}

export const SessionSchema = SchemaFactory.createForClass(Session);
