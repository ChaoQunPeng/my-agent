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
    const reply = await this.chatService.chatWithHistory(params.message, params.conversationId);
    return ApiResponseDto.success({ reply });
  }

  @Post('streamMessage')
  async streamMessage(@Body() params: { message: string; conversationId?: string }) {
    // 返回 SSE 流
    return this.chatService.chatWithHistoryStream(params.message, params.conversationId);
  }

  @Post('getChatHistory')
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
