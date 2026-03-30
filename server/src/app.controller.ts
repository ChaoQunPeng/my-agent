import { Controller, Post, Body } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiResponseDto } from './dto/api-response.dto';
import { ChatWithHistoryDto } from './dto/chat-with-history.dto';
import OpenAI from 'openai';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // ========== 带历史对话的方法 ==========

  @Post('chatWithHistory')
  async chatWithHistory(
    @Body() chatWithHistoryDto: ChatWithHistoryDto,
  ): Promise<ApiResponseDto<{ reply: string }>> {
    const { message } = chatWithHistoryDto;
    const reply = await this.appService.chatWithHistory(message);
    return ApiResponseDto.success({ reply });
  }

  @Post('getFullHistory')
  getFullHistory(): ApiResponseDto<{
    reply: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  }> {
    const reply = this.appService.getFullHistory();
    return ApiResponseDto.success({ reply });
  }
}
