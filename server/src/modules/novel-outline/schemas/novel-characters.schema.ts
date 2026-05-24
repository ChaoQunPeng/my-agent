import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { OutlineCharacter } from './novel-outline.schema';

export type NovelCharactersDocument = NovelCharacters & Document;

/**
 * 第二轮人物表
 * 当前阶段先复制第一轮抽取后的 characters 数据
 */
@Schema({
  timestamps: true,
  collection: 'novel_characters',
})
export class NovelCharacters {
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
        name: {
          type: String,
          required: true,
          comment: '角色主名称',
        },
        aliases: {
          type: [String],
          default: [],
          comment: '已确认别名列表',
        },
        aliasCandidates: {
          type: [String],
          default: [],
          comment: '待确认别名列表',
        },
        identity: {
          type: [String],
          default: [],
          comment: '角色身份',
        },
        personality: {
          type: [String],
          default: [],
          comment: '角色性格',
        },
        goals: {
          type: [String],
          default: [],
          comment: '角色目标',
        },
        traits: {
          type: [String],
          default: [],
          comment: '角色特征',
        },
        relations: {
          type: [String],
          default: [],
          comment: '角色关系描述',
        },
      },
    ],
    default: [],
    comment: '人物列表（从 novel_outlines 复制）',
  })
  characters!: OutlineCharacter[];
}

export const NovelCharactersSchema =
  SchemaFactory.createForClass(NovelCharacters);
