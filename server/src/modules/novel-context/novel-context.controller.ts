import { Controller, Post, Body } from '@nestjs/common';
import { NovelContextService } from './novel-context.service';
import {
  CreateNovelConfigDto,
  UpdateNovelConfigDto,
} from './dto/novel-config.dto';
import { ApiResponseDto } from '../../common/dto/api-response.dto';

@Controller('novel-context')
export class NovelContextController {
  constructor(private readonly novelContextService: NovelContextService) {}

  /**
   * 创建或更新小说配置
   */
  @Post('create-or-update')
  async createOrUpdate(@Body() createDto: CreateNovelConfigDto) {
    const result = await this.novelContextService.createOrUpdate(createDto);
    return ApiResponseDto.success(result, '保存成功');
  }

  /**
   * 根据 sessionId 获取小说配置
   */
  @Post('find-by-session-id')
  async findBySessionId(@Body() params: { sessionId: string }) {
    const result = await this.novelContextService.findBySessionId(
      params.sessionId,
    );
    return ApiResponseDto.success(result);
  }

  /**
   * 更新小说配置
   */
  @Post('update')
  async update(@Body() params: { sessionId: string } & UpdateNovelConfigDto) {
    const { sessionId, ...data } = params;
    const result = await this.novelContextService.update(sessionId, data);
    return ApiResponseDto.success(result, '更新成功');
  }

  /**
   * 删除小说配置
   */
  @Post('delete')
  async remove(@Body() params: { sessionId: string }) {
    await this.novelContextService.remove(params.sessionId);
    return ApiResponseDto.success(null, '删除成功');
  }
}
