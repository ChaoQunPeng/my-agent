import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { NovelContextService } from './novel-context.service';
import { CreateNovelConfigDto, UpdateNovelConfigDto } from './dto/novel-config.dto';

@Controller('novel-context')
export class NovelContextController {
  constructor(private readonly novelContextService: NovelContextService) {}

  /**
   * 创建或更新小说配置
   */
  @Post()
  createOrUpdate(@Body() createDto: CreateNovelConfigDto) {
    return this.novelContextService.createOrUpdate(createDto);
  }

  /**
   * 根据 sessionId 获取小说配置
   */
  @Get(':sessionId')
  findBySessionId(@Param('sessionId') sessionId: string) {
    return this.novelContextService.findBySessionId(sessionId);
  }

  /**
   * 更新小说配置
   */
  @Post(':sessionId')
  update(@Param('sessionId') sessionId: string, @Body() updateDto: UpdateNovelConfigDto) {
    return this.novelContextService.update(sessionId, updateDto);
  }

  /**
   * 删除小说配置
   */
  @Delete(':sessionId')
  remove(@Param('sessionId') sessionId: string) {
    return this.novelContextService.remove(sessionId);
  }
}
