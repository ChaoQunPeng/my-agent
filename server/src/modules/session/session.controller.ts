import { Controller, Get, Post, Body, Param, Delete, Query } from '@nestjs/common';
import { SessionService } from './session.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { ApiResponseDto } from '../../common/dto/api-response.dto';

@Controller('sessions')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  /**
   * 创建新会话
   */
  @Post()
  async create(@Body() createSessionDto: CreateSessionDto) {
    const session = await this.sessionService.create(createSessionDto);
    return ApiResponseDto.success(session, '会话创建成功');
  }

  /**
   * 获取所有会话列表
   */
  @Get()
  async findAll() {
    const sessions = await this.sessionService.findAll();
    return ApiResponseDto.success(sessions);
  }

  /**
   * 获取会话详情（包含消息历史）
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const result = await this.sessionService.findOne(id);
    return ApiResponseDto.success(result);
  }

  /**
   * 更新会话信息
   */
  @Post(':id')
  async update(
    @Param('id') id: string,
    @Body() updateSessionDto: UpdateSessionDto,
  ) {
    const session = await this.sessionService.update(id, updateSessionDto);
    return ApiResponseDto.success(session, '会话更新成功');
  }

  /**
   * 删除会话
   */
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.sessionService.remove(id);
    return ApiResponseDto.success(null, '会话删除成功');
  }

  /**
   * 添加消息到会话
   */
  @Post(':id/messages')
  async addMessage(
    @Param('id') id: string,
    @Body() body: { role: string; content: string },
  ) {
    const message = await this.sessionService.addMessage(id, body.role, body.content);
    return ApiResponseDto.success(message, '消息添加成功');
  }

  /**
   * 获取会话的消息历史
   */
  @Get(':id/messages')
  async getMessageHistory(@Param('id') id: string) {
    const messages = await this.sessionService.getMessageHistory(id);
    return ApiResponseDto.success(messages);
  }

  /**
   * 清除会话的所有消息
   */
  @Delete(':id/messages')
  async clearMessages(@Param('id') id: string) {
    await this.sessionService.clearMessages(id);
    return ApiResponseDto.success(null, '消息已清空');
  }
}
