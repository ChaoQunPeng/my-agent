/**
 * ChatService - AI 对话服务
 */
import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { OpenaiService } from '../../shared/openai/openai.service';
import { CharacterService } from '../character/character.service';
import { SessionService } from '../session/session.service';
import { FileReaderService } from '../../shared/file-reader/file-reader.service';
import { buildNpcPrompt } from '../../common/prompts/character';
import {
  ChatCompletionMessageFunctionToolCall,
  ChatCompletionTool,
} from 'openai/resources';
import { NovelService } from '../novel/novel.service';
import { NovelCharacterService } from '../novel-character/novel-character.service';
import { NovelOrganizationService } from '../novel-organization/novel-organization.service';
import {
  getCharacterContextTool,
  getCharactersByRoleTool,
} from './character.tools';
import { buildInspirationChatPrompt } from '../../common/prompts/inspiration-chat';

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
    private readonly novelService: NovelService,
    private readonly novelCharacterService: NovelCharacterService,
    private readonly novelOrganizationService: NovelOrganizationService,
  ) {}

  /**
   * 动态 System Prompt 构建
   * 根据资源类型和资源ID获取对应的资源信息，构建系统提示词
   * @param type 资源类型
   * @param resourceId 资源ID
   */
  private async buildDynamicSystemPrompt(
    type?: string,
    resourceId?: string,
  ): Promise<string> {
    let systemPrompt = '';

    try {
      // npc
      if (type === 'character' && resourceId) {
        const character = await this.characterService.findOne(resourceId);
        systemPrompt = buildNpcPrompt(character);
      }
      // 小说助手-灵感对话
      else if (type === 'inspiration-chat') {
        const novel = await this.novelService.findOne(resourceId!);
        systemPrompt = buildInspirationChatPrompt(`
          小说名：《 ${novel.name}》

          ${novel.content}
        `);
      }
    } catch (error) {
      console.error(`获取角色信息失败:`, error);
    }

    return systemPrompt;
  }

  private getTools(): ChatCompletionTool[] {
    return [getCharacterContextTool, getCharactersByRoleTool];
  }

  private async getCharacterContext(name: string, novelId: string) {
    const character = await this.novelCharacterService.findOneByName(
      name,
      novelId,
    );

    // 并行查询关系目标，并转换为适合大模型阅读的自然语言。
    const [characterRelationships, organizationRelationships] =
      await Promise.all([
        Promise.all(
          character.relations.map(async (relation) => {
            const target = await this.novelCharacterService.findOne(
              relation.targetId,
            );
            const description = relation.description
              ? `，${relation.description}`
              : '';
            return `${character.name}与${target.name}存在${relation.relation}关系${description}。`;
          }),
        ),
        Promise.all(
          character.organizationRelations.map(async (relation) => {
            const organization = await this.novelOrganizationService.findOne(
              relation.targetId,
            );
            const description = relation.description
              ? `，${relation.description}`
              : '';
            return `${character.name}与${organization.name}存在${relation.relation}关系${description}。`;
          }),
        ),
      ]);

    return {
      id: character.id,
      name: character.name,
      alias: character.alias,
      gender: character.gender,
      age: character.age,
      description: character.description,
      appearance: character.appearance,
      personality: character.personality,
      background: character.background,
      motivation: character.motivation,
      remark: character.remark,
      relationships: [...characterRelationships, ...organizationRelationships],
    };
  }

  /**
   * 根据人物定位关键词获取当前小说的人物概要。
   * 业务场景：回答“谁是主角”这类没有明确人物姓名的问题。
   */
  private async getCharactersByRole(keyword: string, novelId: string) {
    const characters =
      await this.novelCharacterService.findAllByDescriptionOrRemark(
        keyword,
        novelId,
      );

    // 主角识别只需要人物定位字段，避免为列表中的每个人物额外查询关系数据。
    return characters.map((character) => ({
      id: character.id,
      name: character.name,
      alias: character.alias,
      description: character.description,
      remark: character.remark,
    }));
  }

  private async executeTool(
    toolCall: ChatCompletionMessageFunctionToolCall,
    novelId: string,
  ) {
    try {
      if (toolCall.function.name === 'get_character_context') {
        const args = JSON.parse(toolCall.function.arguments) as {
          name?: unknown;
        };
        if (typeof args.name !== 'string' || args.name.trim() === '') {
          return { error: 'name must be a non-empty string' };
        }

        return await this.getCharacterContext(args.name, novelId);
      }

      if (toolCall.function.name === 'get_characters_by_role') {
        const args = JSON.parse(toolCall.function.arguments) as {
          keyword: string;
        };
        return await this.getCharactersByRole(args.keyword, novelId);
      }

      return { error: `Unsupported tool: ${toolCall.function.name}` };
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to get character context',
      };
    }
  }

  /**
   * 标准流式对话 - 存数据库
   * @param userMessage 用户消息
   * @param sessionId 会话ID（可选）
   * @param type 资源类型（可选）
   * @param resourceId 资源ID（可选）
   */
  async *chatWithHistoryStream(
    userMessage: string,
    sessionId?: string,
    type?: string,
    resourceId?: string,
  ): AsyncGenerator<string> {
    const currentMessage = userMessage?.trim();
    if (!currentMessage) throw new Error('Message content cannot be empty');

    // 构建系统提示词
    const systemPrompt = await this.buildDynamicSystemPrompt(type, resourceId);
    const systemMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
      [];
    if (systemPrompt) {
      systemMessages.push({ role: 'system', content: systemPrompt });
    }

    // 获取历史消息
    const customHistory = sessionId
      ? [...(await this.sessionService.getMessageHistory(sessionId))]
      : [];

    // 组装消息列表
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      ...systemMessages,
      ...customHistory,
      { role: 'user', content: currentMessage },
    ];

    if (sessionId) {
      // 统一由聊天服务保存当前消息，避免前后端各写入一次。
      await this.sessionService.addMessage(sessionId, 'user', currentMessage);
    }

    console.log(`这是消息体`);
    console.log(messages);

    // 调用 OpenAI API
    const stream = await this.openaiService.client.chat.completions.create({
      model: this.openaiService.model,
      messages,
      stream: true,
      temperature: 0.5,
      frequency_penalty: 0.3,
      presence_penalty: 0.3,
      tools: this.getTools(),
    });

    // Tool Call 参数可能分散在多个流式片段中，需要按 index 合并。
    const toolCalls: ChatCompletionMessageFunctionToolCall[] = [];
    let fullReply = '';
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      const content = delta?.content || '';
      if (content) {
        fullReply += content;
        yield content;
      }

      for (const toolCallDelta of delta?.tool_calls ?? []) {
        const current = toolCalls[toolCallDelta.index] ?? {
          id: '',
          type: 'function' as const,
          function: { name: '', arguments: '' },
        };
        current.id = toolCallDelta.id ?? current.id;
        current.function.name += toolCallDelta.function?.name ?? '';
        current.function.arguments += toolCallDelta.function?.arguments ?? '';
        toolCalls[toolCallDelta.index] = current;
      }
    }

    if (toolCalls.length > 0) {
      messages.push({
        role: 'assistant',
        content: null,
        tool_calls: toolCalls,
      });

      for (const toolCall of toolCalls) {
        // TODO: 这里要优化写法
        // const novelId = type === 'inspiration-chat' ? resourceId : undefined;
        const result = await this.executeTool(toolCall, resourceId!);
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      }

      // 将 Tool 结果交还模型，生成最终的自然语言回答。
      const finalStream =
        await this.openaiService.client.chat.completions.create({
          model: this.openaiService.model,
          messages,
          stream: true,
          temperature: 0.5,
          frequency_penalty: 0.3,
          presence_penalty: 0.3,
        });

      for await (const chunk of finalStream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullReply += content;
          yield content;
        }
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
