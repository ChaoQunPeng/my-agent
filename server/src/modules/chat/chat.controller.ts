import { Controller, Post, Body, Sse, Query, MessageEvent } from '@nestjs/common';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import OpenAI from 'openai';
import { ChatService } from './chat.service';
import { ChatWithHistoryDto } from './dto/chat.dto';
import { ApiResponseDto } from '../../common/dto/api-response.dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('send')
  async chatWithHistory(
    @Body() dto: ChatWithHistoryDto,
  ): Promise<ApiResponseDto<{ reply: string }>> {
    const reply = await this.chatService.chatWithHistory(dto.message);
    return ApiResponseDto.success({ reply });
  }

  @Sse('stream')
  chatStream(@Query('message') message: string): Observable<MessageEvent> {
    const generator = this.chatService.chatWithHistoryStream(message);
    return from(generator).pipe(
      map((content) => ({ data: { content } }) as MessageEvent),
    );
  }

  @Post('history')
  getFullHistory(): ApiResponseDto<{
    reply: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  }> {
    const reply = this.chatService.getFullHistory();
    return ApiResponseDto.success({ reply });
  }

  @Post('clear')
  clearHistory(): ApiResponseDto<null> {
    this.chatService.clearHistory();
    return ApiResponseDto.success(null, '会话已清空');
  }
}

