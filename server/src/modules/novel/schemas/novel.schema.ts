import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NovelDocument = Novel & Document;

@Schema({
  timestamps: true,
  collection: 'novel',
  id: false, // 关闭 Mongoose 默认虚拟 id，使用业务 id 字段。
})
export class Novel {
  @Prop({ required: true, unique: true, index: true })
  id!: string;

  @Prop({ required: true, trim: true, index: true })
  name!: string;

  // 旧数据没有正文时统一返回空字符串。
  @Prop({ default: '', trim: true })
  content!: string;
}

export const NovelSchema = SchemaFactory.createForClass(Novel);
