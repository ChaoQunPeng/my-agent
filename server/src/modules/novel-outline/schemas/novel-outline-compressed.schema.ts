import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import type {
  OutlineCharacter,
  OutlineEvent,
  OutlineWorldView,
} from './novel-outline.schema';

export type NovelOutlineCompressedDocument = NovelOutlineCompressed & Document;

@Schema({
  timestamps: true,
  collection: 'novel_outline_compressed',
})
export class NovelOutlineCompressed {
  @Prop({
    required: true,
    unique: true,
    index: true,
  })
  novelCode!: string;

  /**
   * 最近一次生成该压缩层的任务ID
   */
  @Prop({
    default: '',
  })
  lastJobId!: string;

  /**
   * 世界观
   * 字段结构与 novel_outlines 保持一致，只压缩内容
   */
  @Prop({
    type: {
      worldType: {
        type: [String],
        default: [],
      },
      summary: {
        type: [String],
        default: [],
      },
      socialStructure: {
        type: [String],
        default: [],
      },
      coreRules: {
        type: [String],
        default: [],
      },
    },
    default: {},
  })
  worldView!: OutlineWorldView;

  /**
   * 人物
   * 字段结构与 novel_outlines 保持一致，只压缩内容
   */
  @Prop({
    type: [
      {
        name: {
          type: String,
          required: true,
        },
        aliases: {
          type: [String],
          default: [],
        },
        aliasCandidates: {
          type: [String],
          default: [],
        },
        identity: {
          type: [String],
          default: [],
        },
        personality: {
          type: [String],
          default: [],
        },
        goals: {
          type: [String],
          default: [],
        },
        traits: {
          type: [String],
          default: [],
        },
        relations: {
          type: [String],
          default: [],
        },
      },
    ],
    default: [],
  })
  characters!: OutlineCharacter[];

  /**
   * 事件
   * 字段结构与 novel_outlines 保持一致，只压缩内容
   */
  @Prop({
    type: [
      {
        title: {
          type: String,
          required: true,
        },
        summary: {
          type: [String],
          default: [],
        },
        characters: {
          type: [String],
          default: [],
        },
        chunkIndex: {
          type: Number,
          default: 0,
        },
      },
    ],
    default: [],
  })
  events!: OutlineEvent[];
}

export const NovelOutlineCompressedSchema = SchemaFactory.createForClass(
  NovelOutlineCompressed,
);
