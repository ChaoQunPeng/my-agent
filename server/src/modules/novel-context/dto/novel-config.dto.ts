import { IsString, IsOptional, IsNumber, IsArray, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CharacterDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  identity?: string;

  @IsString()
  @IsOptional()
  personality?: string;

  @IsString()
  @IsOptional()
  goals?: string;

  @IsString()
  @IsOptional()
  traits?: string;
}

export class CreateNovelConfigDto {
  @IsString()
  sessionId: string;

  @IsString()
  title: string;

  @IsString()
  synopsis: string;

  @IsString()
  @IsOptional()
  world_background?: string;

  @IsString()
  @IsOptional()
  world_logic_rules?: string;

  @IsString()
  @IsOptional()
  world_geography?: string;

  @IsString()
  main_outline: string;

  @IsString()
  @IsOptional()
  writing_tone?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CharacterDto)
  @IsOptional()
  characters_list?: CharacterDto[];

  @IsEnum(['第一人称', '第三人称有限视角', '第三人称上帝视角'])
  @IsOptional()
  writing_perspective?: string;

  @IsNumber()
  @IsOptional()
  target_word_count?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  avoid_plots?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  forbidden_words?: string[];

  @IsString()
  @IsOptional()
  logic_redlines?: string;

  @IsString()
  @IsOptional()
  volume_goal?: string;

  @IsString()
  @IsOptional()
  chapter_goal?: string;
}

export class UpdateNovelConfigDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  synopsis?: string;

  @IsString()
  @IsOptional()
  world_background?: string;

  @IsString()
  @IsOptional()
  world_logic_rules?: string;

  @IsString()
  @IsOptional()
  world_geography?: string;

  @IsString()
  @IsOptional()
  main_outline?: string;

  @IsString()
  @IsOptional()
  writing_tone?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CharacterDto)
  @IsOptional()
  characters_list?: CharacterDto[];

  @IsEnum(['第一人称', '第三人称有限视角', '第三人称上帝视角'])
  @IsOptional()
  writing_perspective?: string;

  @IsNumber()
  @IsOptional()
  target_word_count?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  avoid_plots?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  forbidden_words?: string[];

  @IsString()
  @IsOptional()
  logic_redlines?: string;

  @IsString()
  @IsOptional()
  volume_goal?: string;

  @IsString()
  @IsOptional()
  chapter_goal?: string;
}
