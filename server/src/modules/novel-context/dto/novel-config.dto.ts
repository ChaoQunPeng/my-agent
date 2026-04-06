import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 角色信息 DTO
 */
export class CharacterDto {
  @IsString()
  name: string; // 角色名称

  @IsString()
  @IsOptional()
  identity?: string; // 角色身份/职业

  @IsString()
  @IsOptional()
  personality?: string; // 角色性格描述

  @IsString()
  @IsOptional()
  goals?: string; // 角色目标/动机

  @IsString()
  @IsOptional()
  traits?: string; // 角色特征/特质
}

/**
 * 创建小说配置 DTO
 */
export class CreateNovelConfigDto {
  @IsString()
  novelCode: string; // 小说唯一标识码,关联小说

  @IsString()
  @IsOptional()
  sessionCategory?: string; // 会话分类

  @IsString()
  @IsOptional()
  synopsis?: string; // 小说简介/梗概（改为可选，支持部分更新）

  @IsString()
  @IsOptional()
  worldBackground?: string; // 世界观背景

  @IsString()
  @IsOptional()
  worldLogicRules?: string; // 世界逻辑规则（魔法体系、科技规则等）

  @IsString()
  @IsOptional()
  worldGeography?: string; // 世界地理环境

  @IsString()
  @IsOptional()
  mainOutline?: string; // 主要故事大纲（改为可选，支持部分更新）

  @IsString()
  @IsOptional()
  writingTone?: string; // 写作基调/文风

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CharacterDto)
  @IsOptional()
  charactersList?: CharacterDto[]; // 角色列表

  @IsEnum(['第一人称', '第三人称有限视角', '第三人称上帝视角'])
  @IsOptional()
  writingPerspective?: string; // 写作视角

  @IsNumber()
  @IsOptional()
  targetWordCount?: number; // 目标总字数

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  avoidPlots?: string[]; // 需避免的剧情

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  forbiddenWords?: string[]; // 禁用词汇列表

  @IsString()
  @IsOptional()
  logicRedlines?: string; // 逻辑红线约束
}

/**
 * 更新小说配置 DTO（所有字段可选）
 */
export class UpdateNovelConfigDto {
  @IsString()
  @IsOptional()
  synopsis?: string; // 小说简介/梗概

  @IsString()
  @IsOptional()
  worldBackground?: string; // 世界观背景

  @IsString()
  @IsOptional()
  worldLogicRules?: string; // 世界逻辑规则

  @IsString()
  @IsOptional()
  worldGeography?: string; // 世界地理环境

  @IsString()
  @IsOptional()
  mainOutline?: string; // 主要故事大纲

  @IsString()
  @IsOptional()
  writingTone?: string; // 写作基调/文风

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CharacterDto)
  @IsOptional()
  charactersList?: CharacterDto[]; // 角色列表

  @IsEnum(['第一人称', '第三人称有限视角', '第三人称上帝视角'])
  @IsOptional()
  writingPerspective?: string; // 写作视角

  @IsNumber()
  @IsOptional()
  targetWordCount?: number; // 目标总字数

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  avoidPlots?: string[]; // 需避免的剧情

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  forbiddenWords?: string[]; // 禁用词汇列表

  @IsString()
  @IsOptional()
  logicRedlines?: string; // 逻辑红线约束
}
