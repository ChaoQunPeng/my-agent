/**
 * @deprecated 此 Schema 已废弃,不再使用
 *
 * 原因:
 * 1. 当前 ChatService 使用内存存储会话
 * 2. Session 模块已提供完整的 MongoDB 持久化方案(Session + Message)
 * 3. ChatRepository 中的相关代码已被注释,未实际使用
 *
 * 如需持久化聊天会话,请使用 SessionModule 提供的 SessionService
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ChatSessionDocument = ChatSession & Document;

@Schema({ timestamps: true })
export class ChatSession {
  @Prop({ required: true })
  sessionId: string;

  @Prop({ required: true, type: [Object] })
  history: Record<string, unknown>[];

  @Prop()
  title: string;
}

export const ChatSessionSchema = SchemaFactory.createForClass(ChatSession);
