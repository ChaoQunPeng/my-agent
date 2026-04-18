import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SessionDocument = Session & Document;

@Schema({ timestamps: true })
export class Session {
  @Prop({ required: true, unique: true })
  sessionId!: string;

  @Prop({ default: '新会话' })
  title!: string;

  @Prop({ default: '' })
  summary!: string;

  @Prop({ default: '' })
  category!: string;

  @Prop({ default: '' })
  novelCode!: string;

  // 关联的人物ID（一个会话只能对应一个人物）
  @Prop({ default: '' })
  characterId!: string;
}

export const SessionSchema = SchemaFactory.createForClass(Session);
