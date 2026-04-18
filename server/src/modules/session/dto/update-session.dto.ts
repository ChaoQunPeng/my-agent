import { IsOptional, IsString } from 'class-validator';

/**
 * 更新会话的数据传输对象
 */
export class UpdateSessionDto {
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

  // 资源类型：'character'（角色）| 'novel'（小说）（可选）
  @IsOptional()
  @IsString()
  type?: string;

  // 资源ID：对应type类型的资源ID（可选）
  @IsOptional()
  @IsString()
  resourceId?: string;
}
