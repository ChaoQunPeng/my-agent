import { Controller, Post, Body } from '@nestjs/common';
import { NovelContextService } from './novel-context.service';
import {
  CreateNovelConfigDto,
  UpdateNovelConfigDto,
} from './dto/novel-config.dto';

@Controller('novel-context')
export class NovelContextController {
  constructor(private readonly novelContextService: NovelContextService) {}

  /**
   * 创建或更新小说配置
   */
  @Post('create-or-update')
  createOrUpdate(@Body() createDto: CreateNovelConfigDto) {
    return this.novelContextService.createOrUpdate(createDto);
  }

  /**
   * 根据 sessionId 获取小说配置
   */
  @Post('find-by-session-id')
  findBySessionId(@Body() params: { sessionId: string }) {
    return this.novelContextService.findBySessionId(params.sessionId);
  }

  /**
   * 更新小说配置
   */
  @Post('update')
  update(@Body() params: { sessionId: string } & UpdateNovelConfigDto) {
    const { sessionId, ...data } = params;
    return this.novelContextService.update(sessionId, data);
  }

  /**
   * 删除小说配置
   */
  @Post('delete')
  remove(@Body() params: { sessionId: string }) {
    return this.novelContextService.remove(params.sessionId);
  }
}
