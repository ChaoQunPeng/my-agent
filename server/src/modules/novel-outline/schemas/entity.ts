/**
 * 通用小说知识库实体 Schema
 *
 * 核心思想：
 * 1. 不为具体小说写死字段（例如言灵、斗气、查克拉）
 * 2. 使用 “实体 + 类型 + 动态属性” 模型
 * 3. 所有小说世界统一抽象
 *
 * 适用于：
 * - 小说拆解
 * - 世界观分析
 * - AI续写
 * - RPG/Game数据库
 * - Wiki百科
 * - 知识图谱
 */

/**
 * 所有实体类型
 *
 * 不要轻易增加。
 * 尽量抽象，而不是具体化。
 */
export enum EntityType {
  /**
   * 人物
   * 例如：
   * 路明非、萧炎、鸣人
   */
  CHARACTER = 'character',

  /**
   * 组织
   * 例如：
   * 卡塞尔学院、晓组织、蜀汉
   */
  ORGANIZATION = 'organization',

  /**
   * 地点
   * 例如：
   * 青铜城、木叶村、长安
   */
  LOCATION = 'location',

  /**
   * 种族/生物
   * 例如：
   * 龙族、精灵、人类
   */
  RACE = 'race',

  /**
   * 能力体系
   * 例如：
   * 言灵、斗气、查克拉、魔法
   */
  POWER_SYSTEM = 'power_system',

  /**
   * 技能/招式
   * 例如：
   * 君焰、螺旋丸、佛怒火莲
   */
  SKILL = 'skill',

  /**
   * 物品/装备
   * 例如：
   * 七宗罪、屠龙刀、贤者之石
   */
  ITEM = 'item',

  /**
   * 科技/技术
   * 例如：
   * 智子、诺玛、机甲
   */
  TECHNOLOGY = 'technology',

  /**
   * 世界规则
   * 例如：
   * 血统等级制度
   * 修炼规则
   * 魔法规则
   */
  RULE = 'rule',

  /**
   * 历史事件
   * 例如：
   * 青铜计划
   * 第四次忍界大战
   */
  EVENT = 'event',

  /**
   * 概念/理论/哲学
   * 例如：
   * 血之哀
   * 熵增
   */
  CONCEPT = 'concept',

  /**
   * 势力/阵营
   * 例如：
   * 正道、魔教、联邦
   */
  FACTION = 'faction',

  /**
   * 职业/职业体系
   * 例如：
   * 炼金术师、忍者、骑士
   */
  PROFESSION = 'profession',

  /**
   * 生物/怪物
   * 例如：
   * 巨龙、尾兽、异鬼
   */
  CREATURE = 'creature',

  /**
   * 货币/资源
   * 例如：
   * 灵石、金币、积分
   */
  RESOURCE = 'resource',

  /**
   * 时间体系
   * 例如：
   * 龙历、修仙纪元
   */
  TIMELINE = 'timeline',

  /**
   * 自定义类型
   * 用于未来扩展
   */
  CUSTOM = 'custom',
}

/**
 * 实体关系类型
 *
 * 不建议过度细分。
 * 用通用语义即可。
 */
export enum RelationType {
  /**
   * 属于
   * 路明非 -> 卡塞尔学院
   */
  BELONGS_TO = 'belongs_to',

  /**
   * 敌对
   */
  ENEMY_OF = 'enemy_of',

  /**
   * 盟友
   */
  ALLY_OF = 'ally_of',

  /**
   * 父母
   */
  PARENT_OF = 'parent_of',

  /**
   * 子女
   */
  CHILD_OF = 'child_of',

  /**
   * 兄弟姐妹
   */
  SIBLING_OF = 'sibling_of',

  /**
   * 师徒
   */
  MASTER_OF = 'master_of',

  /**
   * 使用/掌握
   * 人物 -> 技能
   */
  USES = 'uses',

  /**
   * 位于
   */
  LOCATED_IN = 'located_in',

  /**
   * 创建
   */
  CREATED_BY = 'created_by',

  /**
   * 参与事件
   */
  PARTICIPATED_IN = 'participated_in',

  /**
   * 统治
   */
  RULES = 'rules',

  /**
   * 封印
   */
  SEALED = 'sealed',

  /**
   * 自定义
   */
  CUSTOM = 'custom',
}

/**
 * 实体关系
 */
export interface EntityRelation {
  /**
   * 关系ID
   */
  id?: string;

  /**
   * 当前实体ID
   */
  fromEntityId: string;

  /**
   * 目标实体ID
   */
  toEntityId: string;

  /**
   * 关系类型
   */
  type: RelationType;

  /**
   * 关系描述
   *
   * 例如：
   * “路明非是卡塞尔学院学生”
   */
  description?: string;

  /**
   * 关系权重/强度
   *
   * 可用于：
   * - 角色关系图
   * - AI记忆优先级
   */
  weight?: number;

  /**
   * 来源chunk
   */
  sourceChunkIds?: string[];

  /**
   * 置信度
   *
   * AI抽取不是100%可靠
   */
  confidence?: number;
}

/**
 * 通用实体结构
 *
 * 核心：
 * - 固定字段极少
 * - 动态属性极强
 */
export interface NovelEntity {
  /**
   * 实体唯一ID
   */
  id: string;

  /**
   * 小说ID
   */
  novelCode: string;

  /**
   * 实体名称
   */
  name: string;

  /**
   * 实体类型
   */
  type: EntityType;

  /**
   * 别名
   *
   * 例如：
   * 诺诺 -> 陈墨瞳
   */
  aliases?: string[];

  /**
   * 实体简述
   *
   * AI融合后的最终摘要
   */
  summary?: string;

  /**
   * 标签
   *
   * 例如：
   * ["S级", "混血种", "主角"]
   */
  tags?: string[];

  /**
   * 动态属性
   *
   * ⚠️ 核心字段
   *
   * 不同小说自由扩展
   *
   * 例如：
   *
   * {
   *   bloodLevel: "S",
   *   weapon: "七宗罪",
   *   school: "卡塞尔学院"
   * }
   */
  attributes?: Record<string, any>;

  /**
   * 实体关系
   */
  relations?: EntityRelation[];

  /**
   * 来源chunk
   *
   * 用于追踪来源
   */
  sourceChunkIds?: string[];

  /**
   * AI置信度
   */
  confidence?: number;

  /**
   * 是否重要实体
   *
   * 例如主角/核心组织
   */
  isCore?: boolean;

  /**
   * 首次出现章节
   */
  firstAppearanceChapter?: number;

  /**
   * 最后出现章节
   */
  lastAppearanceChapter?: number;

  /**
   * 创建时间
   */
  createdAt?: Date;

  /**
   * 更新时间
   */
  updatedAt?: Date;
}
