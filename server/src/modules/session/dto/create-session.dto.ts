import { IsOptional, IsString } from 'class-validator';

/**
 * 创建会话的数据传输对象
 */
export class CreateSessionDto {
  // 会话标题（可选）
  @IsOptional()
  @IsString()
  title?: string;

  // 会话摘要（可选）
  @IsOptional()
  @IsString()
  summary?: string;

  // 会话分类（可选）
  @IsOptional()
  @IsString()
  category?: string;

  // 模块标识（可选）
  @IsOptional()
  @IsString()
  moduleKey?: string;

  // 资源标识（可选，如小说ID）
  @IsOptional()
  @IsString()
  resourceId?: string;
}
