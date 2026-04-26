/**
 * ChatController - 聊天接口控制器
 *
 * 提供流式和非流式的 AI 对话接口
 * 支持场景标识和角色ID，用于动态构建 System Prompt
 * 会话管理由 SessionModule 负责
 */
import { Controller, Post, Body, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ChatService } from './chat.service';
import { SessionService } from '../session/session.service';
import { ApiResponseDto } from '../../common/dto/api-response.dto';

@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly sessionService: SessionService,
  ) {}

  /**
   * 流式发送消息(SSE) - 使用 POST 请求 + 手动 SSE 响应
   * 前端使用 @microsoft/fetch-event-source 进行消费
   * @param body.message 用户消息内容
   * @param body.sessionId 可选的会话ID
   * @param body.type 资源类型（'character' | 'novel'），用于动态构建 System Prompt
   * @param body.resourceId 资源ID，对应type类型的资源ID
   */
  @Post('stream-message')
  async streamMessage(
    @Body()
    body: {
      message: string;
      sessionId?: string;
      type?: string;
      resourceId?: string;
      temperature?: number;
    },
    @Res() res: Response,
  ): Promise<void> {
    const { message, sessionId, type, resourceId, temperature } = body;

    console.log(
      `收到流式请求 - message: ${message}, sessionId: ${sessionId}, type: ${type}, resourceId: ${resourceId}, temperature: ${temperature}`,
    );

    // 设置 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    try {
      // 调用聊天服务进行流式对话
      const asyncGen = this.chatService.chatWithHistoryStream(
        message,
        sessionId,
        type,
        resourceId,
      );

      for await (const chunk of asyncGen) {
        // 按照 SSE 标准格式写入数据
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }

      // 发送结束标记
      res.write(`data: [DONE]\n\n`);
      res.end();
    } catch (error) {
      // 发送错误事件
      res.write(
        `event: error\ndata: ${JSON.stringify({ message: error instanceof Error ? error.message : 'Unknown error' })}\n\n`,
      );
      res.end();
    }
  }

  /**
   * 获取聊天历史
   * @param params.sessionId 可选的会话ID
   */
  // @Post('get-chat-history')
  // async getChatHistory(@Body() params?: { sessionId?: string }): Promise<
  //   ApiResponseDto<{
  //     reply: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  //   }>
  // > {
  //   if (params?.sessionId) {
  //     // 从 Session Service 获取历史
  //     const history = await this.sessionService.getMessageHistory(
  //       params.sessionId,
  //     );
  //     return ApiResponseDto.success({ reply: history });
  //   }

  //   // 否则返回临时会话的历史
  //   const reply = this.chatService.getHistory();
  //   return ApiResponseDto.success({ reply });
  // }

  /**
   * 清空聊天历史
   * @param params.sessionId 可选的会话ID
   */
  // @Post('clear-chat-history')
  // async clearChatHistory(
  //   @Body() params?: { sessionId?: string },
  // ): Promise<ApiResponseDto<null>> {
  //   if (params?.sessionId) {
  //     // 清空指定会话的消息
  //     await this.sessionService.clearMessages(params.sessionId);
  //     return ApiResponseDto.success(null, '会话消息已清空');
  //   }

  //   // 否则清空临时会话
  //   this.chatService.clearHistory();
  //   return ApiResponseDto.success(null, '会话已清空');
  // }

  /**
   * 流式发送消息(SSE) - 不保存任何记录
   * 前端使用 @microsoft/fetch-event-source 进行消费
   * @param body.message 用户消息内容
   * @param body.systemPrompt 可选的系统提示词
   * @param body.temperature 可选的温度参数，控制生成随机性 (0-2)
   */
  @Post('stream-message-no-record')
  async streamMessageNoRecord(
    @Body()
    body: {
      message: string;
      systemPrompt?: string;
      temperature?: number;
    },
    @Res() res: Response,
  ): Promise<void> {
    const { message, systemPrompt, temperature } = body;

    // 设置 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    try {
      const asyncGen = this.chatService.chatStreamTest(message, systemPrompt, {
        temperature,
      });

      for await (const chunk of asyncGen) {
        // 按照 SSE 标准格式写入数据
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }

      // 发送结束标记
      res.write(`data: [DONE]\n\n`);
      res.end();
    } catch (error) {
      // 发送错误事件
      res.write(
        `event: error\ndata: ${JSON.stringify({ message: error instanceof Error ? error.message : 'Unknown error' })}\n\n`,
      );
      res.end();
    }
  }

  /**
   * 清空聊天历史
   * @param params.sessionId 可选的会话ID
   */
  @Post('clear-test-messages')
  clearTestMessages(): ApiResponseDto<null> {
    // 否则清空临时会话
    this.chatService.clearTempHistory();
    return ApiResponseDto.success(null, '会话已清空');
  }

  /**
   * 获取临时聊天历史
   */
  @Post('get-test-messages')
  getTestMessages(): ApiResponseDto<{ reply: any[] }> {
    // 否则返回临时会话的历史
    const reply = this.chatService.getTempHistory();
    return ApiResponseDto.success({ reply });
  }
}
