/**
 * ChatService - AI 对话服务
 *
 * 提供与 OpenAI 的交互能力,支持:
 * - 非流式对话
 * - 流式对话(SSE)
 * - 自定义历史消息
 * - 动态 System Prompt（基于场景和角色）
 */
import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { OpenaiService } from '../../shared/openai/openai.service';
import { tplContent1 } from './chat-system-prompt';
// 导入 CharacterService 用于获取角色信息
import { CharacterService } from '../character/character.service';
// 导入 SessionService 用于获取会话历史
import { SessionService } from '../session/session.service';

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

  constructor(
    private readonly openaiService: OpenaiService,
    private readonly characterService: CharacterService,
    private readonly sessionService: SessionService,
  ) {}

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
   * 根据角色信息构建动态 System Prompt
   * @param characterId 角色ID
   * @returns 包含角色信息的 System Prompt
   */
  private async buildDynamicSystemPrompt(
    characterId?: string,
  ): Promise<string> {
    // 基础 System Prompt
    let systemPrompt = tplContent1;

    // 如果提供了 characterId，获取角色信息并拼接到 System Prompt
    if (characterId) {
      try {
        const character = await this.characterService.findOne(characterId);

        // 构建角色信息字符串
        const characterInfo = `
# 当前扮演角色

姓名: ${character.name}
性别: ${character.gender === 1 ? '男' : '女'}
年龄: ${character.age}
${character.appearance ? `外貌: ${character.appearance}` : ''}
职业: ${character.profession}

性格概述:
${character.personalityOverview}

性格标签:
${character.personalityTags.map((tag) => `- ${tag}`).join('\n')}

${
  character.behaviorDescriptions && character.behaviorDescriptions.length > 0
    ? `行为描述:
${character.behaviorDescriptions.map((desc, index) => `${index + 1}. ${desc}`).join('\n')}`
    : ''
}

请严格按照以上角色设定进行角色扮演，保持角色的一致性和连贯性。

`;

        // 将角色信息追加到基础 System Prompt
        systemPrompt = systemPrompt + '\n\n' + characterInfo;
      } catch (error) {
        console.error(`获取角色 ${characterId} 信息失败:`, error);
        // 如果获取角色信息失败，使用基础 System Prompt
      }
    }

    return systemPrompt;
  }

  /**
   * 流式对话(SSE)
   * @param userMessage 用户消息
   * @param sessionId 可选的会话ID
   * @param characterId 可选的角色ID，用于动态构建 System Prompt
   */
  async *chatWithHistoryStream(
    userMessage: string,
    sessionId?: string,
    characterId?: string,
  ): AsyncGenerator<string> {
    // 1. 严格校验输入并清理空格
    const cleanMessage = userMessage?.trim();
    if (!cleanMessage) {
      throw new Error('Message content cannot be empty');
    }

    // 构建动态 System Prompt
    const systemPrompt = await this.buildDynamicSystemPrompt(characterId);

    // 构建消息列表
    let messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
    let session: Session | null = null;

    // 如果提供了 sessionId，从 SessionService 获取历史消息
    let customHistory:
      | OpenAI.Chat.Completions.ChatCompletionMessageParam[]
      | undefined;
    if (sessionId) {
      customHistory = await this.sessionService.getMessageHistory(sessionId);
    }

    if (customHistory) {
      // 使用自定义历史
      messages = [
        { role: 'system', content: systemPrompt },
        ...customHistory,
        { role: 'user', content: cleanMessage },
      ];
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
