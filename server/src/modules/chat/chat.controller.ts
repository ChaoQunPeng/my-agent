/*
 * @Author: PengChaoQun 1152684231@qq.com
 * @Date: 2026-04-03 10:51:46
 * @LastEditors: PengChaoQun 1152684231@qq.com
 * @LastEditTime: 2026-04-03 16:47:41
 * @FilePath: /my-agent/server/src/modules/chat/chat.controller.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { Controller, Post, Body, Query, Sse, MessageEvent } from '@nestjs/common';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import OpenAI from 'openai';
import { ChatService } from './chat.service';
import { ChatWithHistoryDto } from './dto/chat.dto';
import { ApiResponseDto } from '../../common/dto/api-response.dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('sendMessage')
  async sendMessage(@Body() params: { message: string; conversationId?: string }) {
    const reply = await this.chatService.chatWithHistory(params.message);
    return ApiResponseDto.success({ reply });
  }

  @Post('streamMessage')
  async streamMessage(@Body() params: { message: string; conversationId?: string }) {
    // 返回 SSE 流
    return this.chatService.chatWithHistoryStream(params.message);
  }

  @Post('get-chat-history')
  getChatHistory(): ApiResponseDto<{
    reply: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  }> {
    const reply = this.chatService.getFullHistory();
    return ApiResponseDto.success({ reply });
  }

  @Post('clearChatHistory')
  clearChatHistory(): ApiResponseDto<null> {
    this.chatService.clearHistory();
    return ApiResponseDto.success(null, '会话已清空');
  }
}
