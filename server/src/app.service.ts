import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { tplContent, tplContent1 } from './system-prompt';

export interface Session {
  id: string;
  history: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  createdAt: Date;
  lastActiveAt: Date;
  title?: string;
}

@Injectable()
export class AppService {
  private apiKey: string;
  private baseUrl: string;
  private openai: OpenAI;
  // 固定使用一个会话，用于个人调试
  private readonly FIXED_SESSION_ID = 'debug_session_001';
  private session: Session | null = null;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.getOrThrow<string>('DEEPSEEK_API_KEY');
    this.baseUrl = this.configService.getOrThrow<string>('DEEPSEEK_API_URL');

    this.openai = new OpenAI({
      apiKey: this.apiKey,
      baseURL: this.baseUrl,
    });
  }

  // ========== 带历史对话的方法 (单会话调试版) ==========

  /**
   * 获取或创建固定会话
   */
  private getOrCreateSession(): Session {
    if (!this.session) {
      this.session = {
        id: this.FIXED_SESSION_ID,
        history: [
          {
            role: 'system',
            content: tplContent1,
          },
        ],
        createdAt: new Date(),
        lastActiveAt: new Date(),
        title: '调试会话',
      };
    }
    return this.session;
  }

  /**
   * 带历史的对话（核心方法）
   * @param userMessage 用户消息
   * @returns AI 回复
   */
  async chatWithHistory(userMessage: string): Promise<string> {
    const session = this.getOrCreateSession();

    // 1. 添加用户消息到历史
    session.history.push({ role: 'user', content: userMessage });

    // 2. 调用 API（传入完整历史）
    const completion = await this.openai.chat.completions.create({
      model: 'deepseek-chat',
      messages: session.history,
      temperature: 0.2,
      max_tokens: 2000,
    });

    const reply = completion.choices[0].message.content || '';

    // 3. 保存 AI 回复到历史
    session.history.push({ role: 'assistant', content: reply });

    // 4. 更新最后活跃时间
    session.lastActiveAt = new Date();

    return reply;
  }

  /**
   * 获取历史对话（不包含 system prompt，便于前端展示）
   * @returns 历史对话数组
   */
  getHistory(): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    if (!this.session) return [];
    // 返回历史，去掉 system prompt
    return this.session.history.slice(1);
  }

  /**
   * 获取完整历史（包含 system prompt）
   * @returns 完整历史对话数组
   */
  getFullHistory(): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    return this.session?.history || [];
  }

  /**
   * 清空会话历史
   */
  clearHistory(): void {
    this.session = null;
  }

  /**
   * 获取会话信息
   */
  getSessionInfo(): {
    id: string;
    title: string;
    createdAt: Date;
    lastActiveAt: Date;
    messageCount: number;
  } | null {
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
