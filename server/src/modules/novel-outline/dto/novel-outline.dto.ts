/*
 * @Author: PengChaoQun 1152684231@qq.com
 * @Date: 2026-04-23 11:18:46
 * @LastEditors: PengChaoQun 1152684231@qq.com
 * @LastEditTime: 2026-05-09 10:22:15
 * @FilePath: /my-agent/server/src/modules/novel-outline/dto/novel-outline.dto.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  IsArray,
  ArrayNotEmpty,
  IsIn,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 上传 txt 并拆分的参数
 * 文件本身走 multipart/form-data 的 file 字段，这里只校验业务参数
 */
export class UploadAndSplitDto {
  @IsString()
  // 小说唯一识别码（与 NovelConfig.novelCode 对齐）
  novelCode!: string;

  // 每个切片的原文总字数上限，默认 5000（包含前后上下文）
  @Type(() => Number)
  @IsInt()
  @Min(500)
  @Max(20000)
  @IsOptional()
  chunkSize?: number;

  // 每块正文前后附带的上下文字数，默认 300
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2000)
  @IsOptional()
  overlap?: number;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  forceResplit?: boolean;
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

export class RebuildNovelMetaDto extends NovelCodeDto {
  @IsString()
  @IsOptional()
  jobId?: string;
}

export class NovelMetaQueryDto extends NovelCodeDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  current?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  pageSize?: number;

  @IsString()
  @IsOptional()
  keyword?: string;
}

/**
 * 查询 novel_split_jobs
 */
export class SplitJobQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  current?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  pageSize?: number;

  @IsString()
  @IsOptional()
  novelCode?: string;

  @IsString()
  @IsOptional()
  jobId?: string;

  @IsIn([
    'splitting',
    'meta_generating',
    'split_done',
    'generating',
    'done',
    'failed',
    'aborted',
  ])
  @IsOptional()
  status?: string;
}

export class SearchChunkMetaDto {
  @IsString()
  novelCode!: string;

  @IsString()
  query!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  @IsOptional()
  topN?: number;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  includeChunks?: boolean;
}

export class AnswerByMetaDto {
  @IsString()
  novelCode!: string;

  @IsString()
  question!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  @IsOptional()
  topN?: number;
}

/**
 * 合并别名请求参数
 */
export class MergeAliasDto {
  @IsString()
  novelCode: string;

  @IsString()
  characterName: string; // 人物姓名

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  aliasesToConfirm: string[]; // 需要确认合并的候选别名列表
}
