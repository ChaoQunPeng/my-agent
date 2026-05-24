import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { OutlineEvent } from './novel-outline.schema';

export type NovelEventsDocument = NovelEvents & Document;

/**
 * 第二轮事件表
 * 当前阶段先复制第一轮抽取后的 events 数据
 */
@Schema({
  timestamps: true,
  collection: 'novel_events',
})
export class NovelEvents {
  @Prop({
    required: true,
    unique: true,
    index: true,
    comment: '小说唯一识别码',
  })
  novelCode!: string;

  @Prop({
    type: [
      {
        title: {
          type: String,
          required: true,
          comment: '事件标题',
        },
        summary: {
          type: [String],
          default: [],
          comment: '事件描述',
        },
        characters: {
          type: [String],
          default: [],
          comment: '涉及角色列表',
        },
        chunkIndex: {
          type: Number,
          default: 0,
          comment: '来源chunk索引',
        },
      },
    ],
    default: [],
    comment: '事件列表（从 novel_outlines 复制）',
  })
  events!: OutlineEvent[];
}

export const NovelEventsSchema = SchemaFactory.createForClass(NovelEvents);
