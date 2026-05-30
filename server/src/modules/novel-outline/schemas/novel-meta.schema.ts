import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NovelMetaDocument = NovelMeta & Document;

@Schema({
  collection: 'novel_meta',
  timestamps: {
    createdAt: true,
    updatedAt: false,
  },
})
export class NovelMeta {
  @Prop({ required: true, index: true, trim: true, comment: '小说唯一识别码' })
  novelCode!: string;

  @Prop({ required: true, trim: true, comment: 'Chunk ID' })
  chunkId!: string;

  @Prop({ required: true, trim: true, comment: 'Chunk 摘要' })
  summary!: string;

  @Prop({ type: [String], default: [], comment: '检索关键词' })
  keywords!: string[];

  @Prop({ type: [String], default: [], comment: '人物实体' })
  characters!: string[];

  @Prop({ type: [String], default: [], comment: '地点实体' })
  locations!: string[];

  @Prop({ type: [String], default: [], comment: '组织实体' })
  organizations!: string[];

  @Prop({ type: [String], default: [], comment: '概念实体' })
  concepts!: string[];

  @Prop({ type: [String], default: [], comment: '事件实体' })
  events!: string[];

  createdAt!: Date;
}

export const NovelMetaSchema = SchemaFactory.createForClass(NovelMeta);

NovelMetaSchema.index({ novelCode: 1, chunkId: 1 }, { unique: true });
