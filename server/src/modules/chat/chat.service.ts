/**
 * ChatService - AI 对话服务
 *
 * 提供与 OpenAI 的交互能力,支持:
 * - 非流式对话
 * - 流式对话(SSE)
 * - 自定义历史消息
 */
import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { OpenaiService } from '../../shared/openai/openai.service';
import { tplContent1 } from './chat-system-prompt';

export interface Session {
  id: string;
  history: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  createdAt: Date;
  lastActiveAt: Date;
  title?: string;
}

@Injectable()
export class ChatService {
  private readonly FIXED_SESSION_ID = 'debug_session_001';
  private session: Session | null = null;

  constructor(private readonly openaiService: OpenaiService) {}

  /**
   * 获取或创建临时调试会话
   */
  private getOrCreateSession(): Session {
    if (!this.session) {
      this.session = {
        id: this.FIXED_SESSION_ID,
        history: [{ role: 'system', content: tplContent1 }],
        createdAt: new Date(),
        lastActiveAt: new Date(),
        title: '调试会话',
      };
    }
    return this.session;
  }

  /**
   * 非流式对话
   * @param userMessage 用户消息
   * @param customHistory 可选的自定义历史消息,如果提供则使用此历史而非内部会话
   */
  async chatWithHistory(
    userMessage: string,
    customHistory?: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  ): Promise<string> {
    // 如果提供了自定义历史,直接使用
    if (customHistory) {
      const messages = [
        { role: 'system' as const, content: tplContent1 },
        ...customHistory,
        { role: 'user' as const, content: userMessage },
      ];

      const completion =
        await this.openaiService.client.chat.completions.create({
          model: this.openaiService.model,
          messages,
          temperature: 0.2,
          max_tokens: 2000,
        });

      return completion.choices[0].message.content || '';
    }

    // 否则使用内部临时会话
    const session = this.getOrCreateSession();
    session.history.push({ role: 'user', content: userMessage });

    const completion = await this.openaiService.client.chat.completions.create({
      model: this.openaiService.model,
      messages: session.history,
      temperature: 0.2,
      max_tokens: 2000,
    });

    const reply = completion.choices[0].message.content || '';
    session.history.push({ role: 'assistant', content: reply });
    session.lastActiveAt = new Date();
    return reply;
  }

  /**
   * 流式对话(SSE)
   * @param userMessage 用户消息
   * @param customHistory 可选的自定义历史消息
   */
  async *chatWithHistoryStream(
    userMessage: string,
    customHistory?: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  ): AsyncGenerator<string> {
    // 1. 严格校验输入
    if (!userMessage?.trim()) {
      throw new Error('Message content cannot be empty');
    }

    // 构建消息列表
    let messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
    let session: Session | null = null;

    if (customHistory) {
      // 使用自定义历史
      messages = [
        { role: 'system', content: tplContent1 },
        ...customHistory,
        { role: 'user', content: String(userMessage) },
      ];
    } else {
      // 使用内部临时会话
      session = this.getOrCreateSession();
      session.history.push({ role: 'user', content: String(userMessage) });

      // 过滤脏数据
      messages = session.history.filter((msg) => msg.role && msg.content);
    }

    try {
      const stream = await this.openaiService.client.chat.completions.create({
        model: this.openaiService.model,
        messages,
        temperature: 0.2,
        max_tokens: 2000,
        stream: true,
      });

      let fullReply = '';
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullReply += content;
          yield content;
        }
      }

      // 如果使用内部会话,保存 AI 回复
      if (session && fullReply.trim()) {
        session.history.push({ role: 'assistant', content: fullReply });
        session.lastActiveAt = new Date();
      }
    } catch (error) {
      // 如果使用内部会话且调用失败,移除最后一条用户消息
      if (session) {
        session.history.pop();
      }
      throw error;
    }
  }

  /**
   * 获取临时会话的历史(不含 system prompt)
   */
  getHistory(): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    if (!this.session) return [];
    return this.session.history.slice(1);
  }

  /**
   * 获取完整历史(含 system prompt)
   */
  getFullHistory(): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    return this.session?.history || [];
  }

  /**
   * 清空临时会话
   */
  clearHistory(): void {
    this.session = null;
  }

  /**
   * 获取临时会话信息
   */
  getSessionInfo() {
    if (!this.session) return null;
    return {
      id: this.session.id,
      title: this.session.title || '未命名会话',
      createdAt: this.session.createdAt,
      lastActiveAt: this.session.lastActiveAt,
      messageCount: this.session.history.filter(
        (msg) => msg.role === 'user' || msg.role === 'assistant',
      ).length,
    };
  }
}
