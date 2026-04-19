import { Controller, Post, Body } from '@nestjs/common';
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
  @Post('create')
  async create(@Body() createSessionDto: CreateSessionDto) {
    const session = await this.sessionService.create(createSessionDto);
    return ApiResponseDto.success(session, '会话创建成功');
  }

  /**
   * 获取所有会话列表
   */
  @Post('list')
  async findAll(@Body() params?: { type?: string }) {
    const sessions = await this.sessionService.findAll(params?.type);
    return ApiResponseDto.success(sessions);
  }

  /**
   * 获取会话详情（包含消息历史）
   */
  @Post('detail')
  async findOne(@Body() params: { id: string }) {
    const result = await this.sessionService.findOne(params.id);
    return ApiResponseDto.success(result);
  }

  /**
   * 更新会话信息
   */
  @Post('update')
  async update(@Body() params: { id: string } & UpdateSessionDto) {
    const { id, ...data } = params;
    const session = await this.sessionService.update(id, data);
    return ApiResponseDto.success(session, '会话更新成功');
  }

  /**
   * 删除会话
   */
  @Post('delete')
  async remove(@Body() params: { id: string }) {
    await this.sessionService.remove(params.id);
    return ApiResponseDto.success(null, '会话删除成功');
  }

  /**
   * 添加消息到会话
   */
  @Post('add-message')
  async addMessage(
    @Body() params: { id: string; role: string; content: string },
  ) {
    const message = await this.sessionService.addMessage(
      params.id,
      params.role,
      params.content,
    );
    return ApiResponseDto.success(message, '消息添加成功');
  }

  /**
   * 获取会话的消息历史
   */
  @Post('get-message-history')
  async getMessageHistory(@Body() params: { id: string }) {
    const messages = await this.sessionService.getMessageHistory(params.id);
    return ApiResponseDto.success(messages);
  }

  /**
   * 清除会话的所有消息
   */
  @Post('clear-messages')
  async clearMessages(@Body() params: { id: string }) {
    await this.sessionService.clearMessages(params.id);
    return ApiResponseDto.success(null, '消息已清空');
  }
}
