/*
 * @Author: PengChaoQun 1152684231@qq.com
 * @Date: 2026-04-03 10:51:46
 * @LastEditors: PengChaoQun 1152684231@qq.com
 * @LastEditTime: 2026-04-03 16:52:30
 * @FilePath: /my-agent/server/src/modules/chat/chat.controller.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
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

  @Post('send-message')
  async sendMessage(
    @Body() params: { message: string; sessionId?: string },
  ) {
    // 如果提供了 sessionId，使用 Session Service
    if (params.sessionId) {
      // 保存用户消息
      await this.sessionService.addMessage(params.sessionId, 'user', params.message);
      
      // 获取历史消息
      const history = await this.sessionService.getMessageHistory(params.sessionId);
      
      // 调用 AI（这里需要修改 ChatService 支持传入历史）
      const reply = await this.chatService.chatWithHistory(params.message);
      
      // 保存 AI 回复
      await this.sessionService.addMessage(params.sessionId, 'assistant', reply);
      
      return ApiResponseDto.success({ reply, sessionId: params.sessionId });
    }
    
    // 否则使用原有的固定会话逻辑
    const reply = await this.chatService.chatWithHistory(params.message);
    return ApiResponseDto.success({ reply });
  }

  @Sse('stream-message')
  streamMessage(
    @Query('message') message: string,
    @Query('sessionId') sessionId?: string,
  ): Observable<{ data: string }> {
    console.log(`message`, message, 'sessionId', sessionId);

    // 如果提供了 sessionId，需要在流式响应中保存消息
    if (sessionId) {
      // 注意：流式响应中保存消息的逻辑需要在 Service 层处理
      // 这里暂时保持原有逻辑，后续可以优化
    }

    const asyncGen = this.chatService.chatWithHistoryStream(message);

    return new Observable((observer) => {
      void (async () => {
        try {
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

  @Post('get-chat-history')
  async getChatHistory(@Body() params?: { sessionId?: string }): Promise<ApiResponseDto<{
    reply: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  }>> {
    if (params?.sessionId) {
      // 从 Session Service 获取历史
      const history = await this.sessionService.getMessageHistory(params.sessionId);
      return ApiResponseDto.success({ reply: history });
    }
    
    // 否则使用原有的固定会话
    const reply = this.chatService.getFullHistory();
    return ApiResponseDto.success({ reply });
  }

  @Post('clear-chat-history')
  async clearChatHistory(@Body() params?: { sessionId?: string }): Promise<ApiResponseDto<null>> {
    if (params?.sessionId) {
      // 清空指定会话的消息
      await this.sessionService.clearMessages(params.sessionId);
      return ApiResponseDto.success(null, '会话消息已清空');
    }
    
    // 否则清空固定会话
    this.chatService.clearHistory();
    return ApiResponseDto.success(null, '会话已清空');
  }
}
