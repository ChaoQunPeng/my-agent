import { IsOptional, IsString } from 'class-validator';

/**
 * 创建会话的数据传输对象
 */
export class CreateSessionDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  novelCode?: string;

  // 关联的人物ID（可选，可以在创建时绑定人物）
  @IsOptional()
  @IsString()
  characterId?: string;
}
