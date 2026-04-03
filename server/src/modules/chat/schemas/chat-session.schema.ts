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

