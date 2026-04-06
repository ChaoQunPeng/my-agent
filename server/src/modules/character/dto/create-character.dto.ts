import {
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  Min,
  Max,
} from 'class-validator';

/**
 * 创建人物的数据传输对象
 * 包含所有必填和可选字段的验证规则
 */
export class CreateCharacterDto {
  // 姓名：真实姓名或代号（必填）
  @IsString()
  name: string;

  // 性别：0-未知, 1-男, 2-女（必填）
  @IsNumber()
  @Min(0)
  @Max(2)
  gender: number;

  // 年龄（必填，必须为正整数）
  @IsNumber()
  @Min(1)
  @Max(150)
  age: number;

  // 外貌：侧重于神态和标志性特征（可选）
  @IsString()
  @IsOptional()
  appearance?: string;

  // 职业：强调描述职业对思维方式的影响（必填）
  @IsString()
  profession: string;

  // 性格概述：矛盾点和内在驱动力的文字描述（必填）
  @IsString()
  personalityOverview: string;

  // 性格标签：关键性格锚点 (3-5个)（必填）
  @IsArray()
  @IsString({ each: true })
  personalityTags: string[];

  // 行为描述：核心是解决问题的逻辑、应对压力的反应（可选）
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  behaviorDescriptions?: string[];
}
