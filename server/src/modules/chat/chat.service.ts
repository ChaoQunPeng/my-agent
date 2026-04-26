/**
 * ChatService - AI 对话服务
 */
import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { OpenaiService } from '../../shared/openai/openai.service';
import { CharacterService } from '../character/character.service';
import { SessionService } from '../session/session.service';
import { FileReaderService } from '../../shared/file-reader/file-reader.service';
import { buildNpcPrompt } from 'src/common/prompts/character';

export interface Session {
  id: string;
  history: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  createdAt: Date;
  lastActiveAt: Date;
  title?: string;
}

@Injectable()
export class ChatService {
  // 1. 缓存读取的素材内容，避免重复读取文件
  private cachedSucaiContent: string | null = null;

  // 2. 临时变量：专门用于 chatStreamNoRecord 的内存上下文（不存数据库）
  private tempHistory: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
    [];

  constructor(
    private readonly openaiService: OpenaiService,
    private readonly characterService: CharacterService,
    private readonly sessionService: SessionService,
    private readonly fileReaderService: FileReaderService,
  ) {}

  /**
   * 动态 System Prompt 构建
   * 根据资源类型和资源ID获取对应的资源信息，构建系统提示词
   * @param type 资源类型（'character' | 'novel'）
   * @param resourceId 资源ID
   */
  private async buildDynamicSystemPrompt(
    type?: string,
    resourceId?: string,
  ): Promise<string> {
    let systemPrompt = '';

    // 如果是角色类型，获取角色信息
    if (type === 'character' && resourceId) {
      try {
        const character = await this.characterService.findOne(resourceId);
        systemPrompt = buildNpcPrompt(character);
      } catch (error) {
        console.error(`获取角色信息失败:`, error);
      }
    }

    // TODO: 未来可以扩展小说类型的处理逻辑
    // if (type === 'novel' && resourceId) { ... }

    return systemPrompt;
  }

  /**
   * 标准流式对话 - 存数据库
   * @param userMessage 用户消息
   * @param sessionId 会话ID（可选）
   * @param type 资源类型（'character' | 'novel'）（可选）
   * @param resourceId 资源ID（可选）
   */
  async *chatWithHistoryStream(
    userMessage: string,
    sessionId?: string,
    type?: string,
    resourceId?: string,
  ): AsyncGenerator<string> {
    const cleanMessage = userMessage?.trim();
    if (!cleanMessage) throw new Error('Message content cannot be empty');

    // 构建系统提示词
    const systemPrompt = await this.buildDynamicSystemPrompt(type, resourceId);
    let messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

    // 获取历史消息
    const customHistory = sessionId
      ? await this.sessionService.getMessageHistory(sessionId)
      : [];

    // 组装消息列表
    messages = [
      { role: 'system', content: systemPrompt },
      ...customHistory,
      { role: 'user', content: cleanMessage },
    ];

    // 调用 OpenAI API
    const stream = await this.openaiService.client.chat.completions.create({
      model: this.openaiService.model,
      messages,
      stream: true,
      temperature: 0.9,
      frequency_penalty: 0.3,
      presence_penalty: 0.3,
    });

    // 流式返回响应
    let fullReply = '';
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullReply += content;
        yield content;
      }
    }

    // 保存 AI 回复到数据库
    if (sessionId && fullReply) {
      await this.sessionService.addMessage(sessionId, 'assistant', fullReply);
    }
  }

  /**
   * 流式对话测试版本（不持久化，仅内存）
   * 1. 使用 cachedSucaiContent 确保文件仅读取一次
   * 2. 使用类成员变量 tempHistory 保留内存上下文（不持久化）
   * 3. 每次对话都会将当前 user 和 assistant 消息推入 tempHistory
   * 4. 支持自定义 temperature 和 systemPrompt
   */
  async *chatStreamTest(
    userMessage: string,
    systemPrompt?: string,
    options: {
      temperature?: number;
    } = {},
  ): AsyncGenerator<string> {
    const cleanMessage = userMessage?.trim();
    if (!cleanMessage) throw new Error('Message content cannot be empty');

    // --- 逻辑 A: 仅在第一次调用时读取素材文件 ---
    // if (this.cachedSucaiContent === null) {
    //   try {
    //     const sucaiPath = path.join(__dirname, '../../../src/shared/sucai');
    //     const content = await this.fileReaderService.readAndConcatFiles(
    //       sucaiPath,
    //       '\n---分割线---\n',
    //     );
    //     this.cachedSucaiContent = content || '素材为空';
    //     console.log('素材文件已首次加载并缓存');
    //   } catch (error) {
    //     console.error('读取素材文件失败:', error);
    //     this.cachedSucaiContent = '读取失败';
    //   }
    // }

    // --- 逻辑 B: 组装消息列表 ---
    // 基础 System 信息 - 如果提供了自定义 systemPrompt，则使用它
    const finalSystemPrompt = systemPrompt || '';

    const systemMessage: OpenAI.Chat.Completions.ChatCompletionMessageParam = {
      role: 'system',
      content: finalSystemPrompt,
    };

    // 将用户当前消息加入临时历史
    this.tempHistory.push({ role: 'user', content: cleanMessage });

    // 组合：System + 内存中的历史记录
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      systemMessage,
      ...this.tempHistory,
    ];

    // 验证 temperature 参数范围 (0-2)
    const validTemperature =
      options.temperature !== undefined
        ? Math.max(0, Math.min(2, options.temperature))
        : 0.7;

    // --- 逻辑 C: 请求 OpenAI ---
    const stream = await this.openaiService.client.chat.completions.create({
      model: this.openaiService.model,
      messages,
      temperature: validTemperature,
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

    // --- 逻辑 D: 将 AI 回复保存到内存变量，以便下一次请求使用 ---
    if (fullReply) {
      this.tempHistory.push({ role: 'assistant', content: fullReply });

      // 可选：为了防止内存溢出，可以限制临时历史的长度（例如保留最近20条）
      if (this.tempHistory.length > 20) {
        this.tempHistory = this.tempHistory.slice(-20);
      }
    }
  }

  getTempHistory(): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    return this.tempHistory;
  }

  /**
   * 重置测试对话历史
   */
  clearTempHistory(): void {
    this.tempHistory = [];
  }
}
