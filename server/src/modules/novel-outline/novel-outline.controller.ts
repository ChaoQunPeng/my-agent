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
  StartGenerateDto,
  JobIdDto,
  NovelCodeDto,
  MergeAliasDto,
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
    // multer 默认按 latin1 解码 originalname，中文会乱码（如 é¾æ[1-3é¨å¨].txt），
    // 这里统一按 utf-8 重新解码还原真实文件名
    const originalName = Buffer.from(file.originalname, 'latin1').toString(
      'utf8',
    );
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
   * 启动或续跑大纲生成（异步），立即返回任务快照
   */
  @Post('start-generate')
  async startGenerate(@Body() body: StartGenerateDto) {
    const job = await this.novelOutlineService.startGenerate(body.jobId);
    return ApiResponseDto.success(job, '已开始生成');
  }

  /**
   * 查询任务状态 / 进度
   */
  @Post('job-status')
  async jobStatus(@Body() body: JobIdDto) {
    const job = await this.novelOutlineService.getJobStatus(body.jobId);
    return ApiResponseDto.success(job);
  }

  /**
   * 中止生成任务，保留切片与进度以便续跑
   */
  @Post('abort-job')
  async abortJob(@Body() body: JobIdDto) {
    await this.novelOutlineService.abortJob(body.jobId);
    return ApiResponseDto.success(null, '已中止');
  }

  /**
   * 获取小说大纲
   */
  @Post('get-outline')
  async getOutline(@Body() body: NovelCodeDto) {
    const outline = await this.novelOutlineService.getOutline(body.novelCode);
    return ApiResponseDto.success(outline);
  }

  /**
   * 根据小说编码查询任务列表
   */
  @Post('list-jobs')
  async listJobs(@Body() body: NovelCodeDto) {
    const jobs = await this.novelOutlineService.listJobs(body.novelCode);
    return ApiResponseDto.success(jobs);
  }

  /**
   * 获取待确认的别名候选列表
   */
  @Post('get-alias-candidates')
  async getAliasCandidates(@Body() body: NovelCodeDto) {
    const candidates = await this.novelOutlineService.getAliasCandidates(
      body.novelCode,
    );
    return ApiResponseDto.success(candidates);
  }

  /**
   * 确认合并别名（将候选别名合并到正式别名）
   */
  @Post('merge-alias')
  async mergeAlias(@Body() body: MergeAliasDto) {
    await this.novelOutlineService.mergeAlias(body);
    return ApiResponseDto.success(null, '别名合并成功');
  }
}
