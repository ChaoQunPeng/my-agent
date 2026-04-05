/**
 * ChatController - 聊天接口控制器
 *
 * 提供流式和非流式的 AI 对话接口
 * 会话管理由 SessionModule 负责
 */
import { Controller, Post, Body, Sse, Query } from '@nestjs/common';
import OpenAI from 'openai';
import { ChatService } from './chat.service';
import { SessionService } from '../session/session.service';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { Observable } from 'rxjs';

@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly sessionService: SessionService,
  ) {}

  /**
   * 发送消息(非流式)
   * @param params.message 用户消息内容
   * @param params.sessionId 可选的会话ID,提供则使用持久化会话
   */
  @Post('send-message')
  async sendMessage(@Body() params: { message: string; sessionId?: string }) {
    // 如果提供了 sessionId，使用 Session Service
    if (params.sessionId) {
      // 保存用户消息
      await this.sessionService.addMessage(
        params.sessionId,
        'user',
        params.message,
      );

      // 获取历史消息
      const history = await this.sessionService.getMessageHistory(
        params.sessionId,
      );

      // 调用 AI（传入历史消息）
      const reply = await this.chatService.chatWithHistory(
        params.message,
        history,
      );

      // 保存 AI 回复
      await this.sessionService.addMessage(
        params.sessionId,
        'assistant',
        reply,
      );

      return ApiResponseDto.success({ reply, sessionId: params.sessionId });
    }

    // 否则使用临时的调试会话
    const reply = await this.chatService.chatWithHistory(params.message);
    return ApiResponseDto.success({ reply });
  }

  /**
   * 流式发送消息(SSE)
   * @param message 用户消息内容
   * @param sessionId 可选的会话ID
   */
  @Sse('stream-message')
  streamMessage(
    @Query('message') message: string,
    @Query('sessionId') sessionId?: string,
  ): Observable<{ data: string }> {
    console.log(`收到流式请求 - message: ${message}, sessionId: ${sessionId}`);

    // 如果提供了 sessionId,获取历史消息并传入
    const streamGenerator = async () => {
      if (sessionId) {
        const history = await this.sessionService.getMessageHistory(sessionId);
        return this.chatService.chatWithHistoryStream(message, history);
      }
      return this.chatService.chatWithHistoryStream(message);
    };

    return new Observable((observer) => {
      void (async () => {
        try {
          const asyncGen = await streamGenerator();
          for await (const chunk of asyncGen) {
            observer.next({ data: chunk });
          }
          observer.complete();
        } catch (error) {
          observer.error(error);
        }
      })();
    });
  }

  /**
   * 获取聊天历史
   * @param params.sessionId 可选的会话ID
   */
  @Post('get-chat-history')
  async getChatHistory(@Body() params?: { sessionId?: string }): Promise<
    ApiResponseDto<{
      reply: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
    }>
  > {
    if (params?.sessionId) {
      // 从 Session Service 获取历史
      const history = await this.sessionService.getMessageHistory(
        params.sessionId,
      );
      return ApiResponseDto.success({ reply: history });
    }

    // 否则返回临时会话的历史
    const reply = this.chatService.getFullHistory();
    return ApiResponseDto.success({ reply });
  }

  /**
   * 清空聊天历史
   * @param params.sessionId 可选的会话ID
   */
  @Post('clear-chat-history')
  async clearChatHistory(
    @Body() params?: { sessionId?: string },
  ): Promise<ApiResponseDto<null>> {
    if (params?.sessionId) {
      // 清空指定会话的消息
      await this.sessionService.clearMessages(params.sessionId);
      return ApiResponseDto.success(null, '会话消息已清空');
    }

    // 否则清空临时会话
    this.chatService.clearHistory();
    return ApiResponseDto.success(null, '会话已清空');
  }
}
