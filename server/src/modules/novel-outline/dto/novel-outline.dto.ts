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

  // 每个切片的原文总字数上限，默认 15000（包含前后上下文）
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
}

/**
 * 单块文本提取
 */
export class StartExtractDto {
  @IsString()
  novelCode: string;
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
