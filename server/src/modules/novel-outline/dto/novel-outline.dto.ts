import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 上传 txt 并拆分的参数
 * 文件本身走 multipart/form-data 的 file 字段，这里只校验业务参数
 */
export class UploadAndSplitDto {
  @IsString()
  // 小说唯一识别码（与 NovelConfig.novelCode 对齐）
  novelCode: string;

  // 每块字数，默认 5000
  @Type(() => Number)
  @IsInt()
  @Min(500)
  @Max(20000)
  @IsOptional()
  chunkSize?: number;

  // 相邻块之间的重叠字数，默认 300
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2000)
  @IsOptional()
  overlap?: number;
}

/**
 * 启动（或续跑）大纲生成
 */
export class StartGenerateDto {
  @IsString()
  jobId: string;
}

/**
 * 通用的 jobId 查询入参
 */
export class JobIdDto {
  @IsString()
  jobId: string;
}

/**
 * 按 novelCode 查询
 */
export class NovelCodeDto {
  @IsString()
  novelCode: string;
}
