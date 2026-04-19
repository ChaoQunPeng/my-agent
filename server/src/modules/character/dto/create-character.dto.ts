import {
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  IsDateString,
  Min,
  Max,
} from 'class-validator';

/**
 * 创建人物的数据传输对象
 * 包含所有必填和可选字段的验证规则
 */
export class CreateCharacterDto {
  // 姓名：唯一的必填项（必填）
  @IsString()
  name!: string;

  // 性别：0-未知, 1-男, 2-女, 3-其他（可选，默认0）
  @IsNumber()
  @Min(0)
  @Max(3)
  @IsOptional()
  gender?: number;

  // 出生年月：ISO 8601 格式的日期字符串（可选）
  @IsDateString()
  @IsOptional()
  birthday?: string;

  // 外貌：侧重于神态和标志性特征（可选）
  @IsString()
  @IsOptional()
  appearance?: string;

  // 职业：描述职业对思维方式的影响（可选）
  @IsString()
  @IsOptional()
  profession?: string;

  // 性格描述：矛盾点和内在驱动力的文字描述（可选）
  @IsString()
  @IsOptional()
  personalityDescription?: string;

  // 与我的关系：描述与人物的关系（可选）
  @IsString()
  @IsOptional()
  relation?: string;

  // 行为图谱：核心是解决问题的逻辑、应对压力的反应（可选）
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  behaviorAtlas?: string[];
}
