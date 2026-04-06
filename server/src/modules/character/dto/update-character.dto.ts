import {
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  Min,
  Max,
} from 'class-validator';

/**
 * 更新人物的数据传输对象
 * 所有字段都是可选的，用于部分更新
 */
export class UpdateCharacterDto {
  // 姓名：真实姓名或代号（可选）
  @IsString()
  @IsOptional()
  name?: string;

  // 性别：0-未知, 1-男, 2-女（可选）
  @IsNumber()
  @Min(0)
  @Max(2)
  @IsOptional()
  gender?: number;

  // 年龄（可选）
  @IsNumber()
  @Min(1)
  @Max(150)
  @IsOptional()
  age?: number;

  // 外貌：侧重于神态和标志性特征（可选）
  @IsString()
  @IsOptional()
  appearance?: string;

  // 职业：强调描述职业对思维方式的影响（可选）
  @IsString()
  @IsOptional()
  profession?: string;

  // 性格概述：矛盾点和内在驱动力的文字描述（可选）
  @IsString()
  @IsOptional()
  personalityOverview?: string;

  // 性格标签：关键性格锚点 (3-5个)（可选）
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  personalityTags?: string[];

  // 行为描述：核心是解决问题的逻辑、应对压力的反应（可选）
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  behaviorDescriptions?: string[];
}
