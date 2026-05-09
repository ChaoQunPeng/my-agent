/*
 * @Author: PengChaoQun 1152684231@qq.com
 * @Date: 2026-04-23 11:20:51
 * @LastEditors: PengChaoQun 1152684231@qq.com
 * @LastEditTime: 2026-05-09 10:22:18
 * @FilePath: /my-agent/server/src/modules/novel-outline/novel-outline.controller.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import {
  Controller,
  Post,
  Body,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
import { NovelOutlineService } from './novel-outline.service';
import {
  UploadAndSplitDto,
  StartExtractDto,
  NovelCodeDto,
} from './dto/novel-outline.dto';
import { ApiResponseDto } from '../../common/dto/api-response.dto';

/**
 * 小说大纲生成 Controller
 * 所有接口使用 POST，保持与项目内其他模块一致
 */
@Controller('novel-outline')
export class NovelOutlineController {
  // 允许的单个上传文件大小（50MB）
  private static readonly MAX_FILE_SIZE = 50 * 1024 * 1024;

  constructor(private readonly novelOutlineService: NovelOutlineService) {}

  /**
   * 上传 txt 文件并启动拆分
   * 前端使用 multipart/form-data，字段 file 为 txt 文件，其他字段为 UploadAndSplitDto
   */
  @Post('upload-and-split')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: NovelOutlineController.MAX_FILE_SIZE },
    }),
  )
  async uploadAndSplit(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: UploadAndSplitDto,
  ) {
    if (!file) {
      throw new BadRequestException('请上传 txt 文件（字段名：file）');
    }
    const originalName = this.normalizeUploadFileName(file.originalname);
    // 简单校验扩展名 & mime
    const name = originalName.toLowerCase();
    if (!name.endsWith('.txt')) {
      throw new BadRequestException('仅支持 .txt 文件');
    }

    // 参数兜底：默认每个切片最多 15000 字原文，前后各 300 字上下文
    const chunkSize = body.chunkSize ?? 15000;
    const overlap = body.overlap ?? 300;
    if (overlap * 2 >= chunkSize) {
      throw new BadRequestException('overlap * 2 必须小于 chunkSize');
    }

    const job = await this.novelOutlineService.createJobAndSplit({
      novelCode: body.novelCode,
      chunkSize,
      overlap,
      sourceFileName: originalName,
      fileBuffer: file.buffer,
    });
    return ApiResponseDto.success(job, '拆分完成');
  }

  /**
   * 兼容不同 multer/busboy 版本对中文文件名的处理：
   * 有些版本拿到的是已正确解码的 UTF-8，有些会把 UTF-8 字节按 latin1 展示成乱码。
   */
  private normalizeUploadFileName(fileName: string): string {
    if (!fileName) return fileName;

    const hasNonLatin1Char = Array.from(fileName).some(
      (char) => char.charCodeAt(0) > 0xff,
    );
    if (hasNonLatin1Char) return fileName;

    const decoded = Buffer.from(fileName, 'latin1').toString('utf8');
    if (decoded.includes('\uFFFD')) return fileName;

    return decoded;
  }

  /**
   * 提取单个 chunk 并增量写入大纲
   */
  @Post('start-extract')
  async startExtract(@Body() body: StartExtractDto) {
    const job = await this.novelOutlineService.startExtract(body);
    return ApiResponseDto.success(job, '提取完成');
  }

  /**
   * 根据 novelCode 获取 novel_outlines 中的数据
   */
  @Post('find-by-novel-code')
  async findByNovelCode(@Body() body: NovelCodeDto) {
    const result = await this.novelOutlineService.findByNovelCode(
      body.novelCode,
    );
    return ApiResponseDto.success(result);
  }
}
