import { IsOptional, IsString } from 'class-validator';

/**
 * 更新会话的数据传输对象
 */
export class UpdateSessionDto {
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

  // 关联的人物ID（可选，用于更新会话绑定的人物）
  @IsOptional()
  @IsString()
  characterId?: string;
}
