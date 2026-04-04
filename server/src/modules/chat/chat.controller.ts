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
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { Observable } from 'rxjs';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('send-message')
  async sendMessage(
    @Body() params: { message: string; conversationId?: string },
  ) {
    const reply = await this.chatService.chatWithHistory(params.message);
    return ApiResponseDto.success({ reply });
  }

  @Sse('stream-message')
  streamMessage(
    @Query('message') message: string,
  ): Observable<{ data: string }> {
    console.log(`message`, message);

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
  getChatHistory(): ApiResponseDto<{
    reply: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  }> {
    const reply = this.chatService.getFullHistory();
    return ApiResponseDto.success({ reply });
  }

  @Post('clear-chat-history')
  clearChatHistory(): ApiResponseDto<null> {
    this.chatService.clearHistory();
    return ApiResponseDto.success(null, '会话已清空');
  }
}
