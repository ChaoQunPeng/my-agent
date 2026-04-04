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

  async chatWithHistory(userMessage: string): Promise<string> {
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

  async *chatWithHistoryStream(userMessage: string): AsyncGenerator<string> {
    // 1. 严格校验输入
    if (!userMessage?.trim()) {
      throw new Error('Message content cannot be empty');
    }

    const session = this.getOrCreateSession();

    // 2. 确保推入的对象格式严格正确
    session.history.push({ role: 'user', content: String(userMessage) });

    // 3. 关键：过滤掉 history 中任何可能存在的脏数据
    const validMessages = session.history.filter(
      (msg) => msg.role && msg.content,
    );

    try {
      const stream = await this.openaiService.client.chat.completions.create({
        model: this.openaiService.model,
        messages: validMessages, // 使用过滤后的合法数据
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

      // 4. 确保 AI 的回复也有内容才推入历史
      if (fullReply.trim()) {
        session.history.push({ role: 'assistant', content: fullReply });
      }
      session.lastActiveAt = new Date();
    } catch (error) {
      // 如果 OpenAI 调用失败，记得从历史记录中移除最后一条刚才发出的 userMessage
      // 否则下次请求时，历史记录里就会多出一条“只有用户提问没有 AI 回复”的内容
      session.history.pop();
      throw error;
    }
  }

  getHistory(): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    if (!this.session) return [];
    return this.session.history.slice(1);
  }

  getFullHistory(): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    return this.session?.history || [];
  }

  clearHistory(): void {
    this.session = null;
  }

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
