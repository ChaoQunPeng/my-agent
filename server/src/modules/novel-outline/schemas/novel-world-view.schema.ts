import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { OutlineWorldView } from './novel-outline.schema';

export type NovelWorldViewDocument = NovelWorldView & Document;

/**
 * 第二轮归并后的世界观表
 * 保留与 OutlineWorldView 完全一致的字段结构，并通过 novelCode 关联小说
 */
@Schema({
  timestamps: true,
  collection: 'novel_worldView',
})
export class NovelWorldView implements OutlineWorldView {
  @Prop({
    required: true,
    unique: true,
    index: true,
    comment: '小说唯一识别码',
  })
  novelCode!: string;

  @Prop({
    type: [String],
    default: [],
    comment: '世界类型（修仙/都市/科幻等）',
  })
  worldType!: string[];

  @Prop({
    type: [String],
    default: [],
    comment: '世界观总结描述',
  })
  summary!: string[];

  @Prop({
    type: [String],
    default: [],
    comment: '社会结构（组织/阶级/体系）',
  })
  socialStructure!: string[];

  @Prop({
    type: [String],
    default: [],
    comment: '世界核心规则列表',
  })
  coreRules!: string[];
}

export const NovelWorldViewSchema =
  SchemaFactory.createForClass(NovelWorldView);
