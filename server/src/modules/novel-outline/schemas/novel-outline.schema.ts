import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NovelOutlineDocument = NovelOutline & Document;

/**
 * 人物结构
 * 用于描述小说中的角色信息（支持增量合并）
 */
export interface OutlineCharacter {
  /**
   * 角色主名称（唯一标识倾向）
   */
  name: string;

  /**
   * 已确认别名（已确定属于该角色的称呼）
   */
  aliases?: string[];

  /**
   * 待确认别名（需要后续 merge 或人工确认）
   */
  aliasCandidates?: string[];

  /**
   * 角色身份（如：学生 / 修士 / 警察 / CEO）
   */
  identity?: string;

  /**
   * 性格特征（如：冷静 / 冲动 / 理性）
   */
  personality?: string;

  /**
   * 角色目标 / 动机
   */
  goals?: string;

  /**
   * 外在或内在特征总结
   */
  traits?: string;

  /**
   * 与其他角色的关系描述（自由文本）
   */
  relations?: string;
}

/**
 * 剧情事件结构
 * 用于记录小说发展中的关键事件节点（按 chunk 增量生成）
 */
export interface OutlineEvent {
  /**
   * 事件标题（简短概括）
   */
  title: string;

  /**
   * 事件详细描述（发生了什么）
   */
  summary?: string;

  /**
   * 涉及到的角色名称列表
   */
  characters?: string[];

  /**
   * chunk 索引（用于溯源事件来源）
   */
  chunkIndex?: number;
}

/**
 * 世界观结构（轻量版）
 * 只做宏观总结，不做实体拆分
 */
export interface OutlineWorldView {
  /**
   * 世界类型（如：修仙 / 都市 / 科幻 / 西幻）
   */
  worldType?: string;

  /**
   * 世界观整体描述（AI总结）
   */
  summary?: string;

  /**
   * 社会结构（如：宗门体系 / 公司社会 / 联邦制度）
   */
  socialStructure?: string;

  /**
   * 核心规则（世界运行逻辑）
   */
  coreRules?: string[];
}

/**
 * 小说大纲主表
 * 一个 novelCode 对应一份持续增量更新的大纲数据
 */
@Schema({
  timestamps: true,
  collection: 'novel_outlines',
})
export class NovelOutline {
  /**
   * 小说唯一识别码
   * 用于关联拆分任务与大纲数据
   */
  @Prop({
    required: true,
    unique: true,
    index: true,
    comment: '小说唯一识别码',
  })
  novelCode!: string;

  /**
   * 最近一次生成该大纲的任务ID
   * 用于追踪来源与调试
   */
  @Prop({
    default: '',
    comment: '最近一次生成该大纲的任务ID',
  })
  lastJobId!: string;

  /**
   * 世界观数据（轻结构化）
   * 描述小说整体背景与运行逻辑
   */
  @Prop({
    type: {
      worldType: {
        type: String,
        default: '',
        comment: '世界类型（修仙/都市/科幻等）',
      },
      summary: {
        type: String,
        default: '',
        comment: '世界观总结描述',
      },
      socialStructure: {
        type: String,
        default: '',
        comment: '社会结构（组织/阶级/体系）',
      },
      coreRules: {
        type: [String],
        default: [],
        comment: '世界核心规则列表',
      },
    },
    default: {},
    comment: '世界观信息',
  })
  worldView!: OutlineWorldView;

  /**
   * 人物列表
   * 支持增量提取 + alias 合并
   */
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
          type: String,
          default: '',
          comment: '角色身份',
        },
        personality: {
          type: String,
          default: '',
          comment: '角色性格',
        },
        goals: {
          type: String,
          default: '',
          comment: '角色目标',
        },
        traits: {
          type: String,
          default: '',
          comment: '角色特征',
        },
        relations: {
          type: String,
          default: '',
          comment: '角色关系描述',
        },
      },
    ],
    default: [],
    comment: '人物列表（核心实体）',
  })
  characters!: OutlineCharacter[];

  /**
   * 剧情事件列表
   * 用于构建时间线 / 故事推进结构
   */
  @Prop({
    type: [
      {
        title: {
          type: String,
          required: true,
          comment: '事件标题',
        },
        summary: {
          type: String,
          default: '',
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
    comment: '剧情事件列表',
  })
  events!: OutlineEvent[];
}

export const NovelOutlineSchema = SchemaFactory.createForClass(NovelOutline);
