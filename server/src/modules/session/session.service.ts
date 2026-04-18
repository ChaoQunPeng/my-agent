import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Session, SessionDocument } from './schemas/session.schema';
import { Message, MessageDocument } from './schemas/message.schema';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import OpenAI from 'openai';

@Injectable()
export class SessionService {
  /**
   * 内存消息历史缓存
   * Key: sessionId
   * Value: 纯粹的消息数组，不搞过期时间，重启即失效（重新查库）
   */
  private readonly historyMap = new Map<
    string,
    OpenAI.Chat.Completions.ChatCompletionMessageParam[]
  >();

  constructor(
    @InjectModel(Session.name) private sessionModel: Model<SessionDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
  ) {}

  /**
   * 获取会话的消息历史（转换为 OpenAI 格式）
   * 内存优先，内存没有才查库
   */
  async getMessageHistory(
    sessionId: string,
  ): Promise<OpenAI.Chat.Completions.ChatCompletionMessageParam[]> {
    // 1. 如果内存里已经有这个会话的记录，直接返回
    if (this.historyMap.has(sessionId)) {
      return this.historyMap.get(sessionId)!;
    }

    // 2. 内存没有（如服务重启），从数据库加载一次
    const messages = await this.messageModel
      .find({ sessionId })
      .sort({ timestamp: 1 })
      .exec();

    const formatted = messages.map(
      (msg) =>
        ({
          role: msg.role as OpenAI.Chat.Completions.ChatCompletionMessageParam['role'],
          content: msg.content,
        }) as OpenAI.Chat.Completions.ChatCompletionMessageParam,
    );

    // 3. 写入内存，方便下次快速读取
    this.historyMap.set(sessionId, formatted);
    return formatted;
  }

  /**
   * 添加新消息
   * 核心逻辑：写库 + 同步更新内存
   */
  async addMessage(
    sessionId: string,
    role: string,
    content: string,
  ): Promise<Message> {
    // 1. 验证会话是否存在（个人用可根据需求决定是否保留此强校验）
    const session = await this.sessionModel.findOne({ sessionId }).exec();
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    // 2. 自动生成标题逻辑：如果是第一条用户消息
    const currentHistory = await this.getMessageHistory(sessionId);
    if (role === 'user' && currentHistory.length === 0) {
      const title = this.generateTitleFromMessage(content);
      await this.sessionModel.updateOne({ sessionId }, { $set: { title } });
    }

    // 3. 保存消息到数据库
    const message = new this.messageModel({
      sessionId,
      role,
      content,
      timestamp: new Date(),
    });
    const savedMessage = await message.save();

    // 4. 【关键】同步更新内存中的数组，确保 AI 下一秒就能读到这条消息
    const openAIRole =
      role as OpenAI.Chat.Completions.ChatCompletionMessageParam['role'];
    currentHistory.push({
      role: openAIRole,
      content,
    } as OpenAI.Chat.Completions.ChatCompletionMessageParam);
    this.historyMap.set(sessionId, currentHistory);

    return savedMessage;
  }

  /**
   * 创建新会话
   */
  async create(createSessionDto: CreateSessionDto): Promise<Session> {
    // 生成唯一的会话ID
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // 创建会话实例
    const createdSession = new this.sessionModel({
      sessionId,
      title: createSessionDto.title || '新会话',
      summary: createSessionDto.summary || '',
      category: createSessionDto.category || '',
      type: createSessionDto.type || '',
      resourceId: createSessionDto.resourceId || '',
      testId: createSessionDto.testId || '123',
    });

    console.log(`createdSession`, createdSession);

    // 初始化内存为空数组
    this.historyMap.set(sessionId, []);

    return createdSession.save();
  }

  /**
   * 更新会话基础信息（如标题、摘要等）
   */
  async update(
    sessionId: string,
    updateSessionDto: UpdateSessionDto,
  ): Promise<Session> {
    const updatedSession = await this.sessionModel
      .findOneAndUpdate(
        { sessionId },
        { $set: updateSessionDto },
        { new: true },
      )
      .exec();

    if (!updatedSession) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    return updatedSession;
  }

  /**
   * 删除会话及其关联的所有数据
   */
  async remove(sessionId: string): Promise<void> {
    await this.sessionModel.deleteOne({ sessionId }).exec();
    await this.messageModel.deleteMany({ sessionId }).exec();

    // 彻底清除内存
    this.historyMap.delete(sessionId);
  }

  /**
   * 清空消息但保留会话
   */
  async clearMessages(sessionId: string): Promise<void> {
    await this.messageModel.deleteMany({ sessionId }).exec();

    // 重置内存为空数组
    this.historyMap.set(sessionId, []);
  }

  /**
   * 获取会话列表
   * @param category 可选的分类筛选条件
   * @param type 可选的资源类型筛选条件（'character' | 'novel'）
   * @param resourceId 可选的资源ID筛选条件
   */
  async findAll(category?: string, type?: string, resourceId?: string): Promise<Session[]> {
    // 构建查询条件
    const query: Record<string, string> = {};
    if (category) query.category = category;
    if (type) query.type = type;
    if (resourceId) query.resourceId = resourceId;
    
    // 按更新时间倒序返回
    return this.sessionModel.find(query).sort({ updatedAt: -1 }).exec();
  }

  /**
   * 获取单个会话详情（包含消息历史）
   */
  async findOne(sessionId: string): Promise<{
    session: Session;
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  }> {
    const session = await this.sessionModel.findOne({ sessionId }).exec();

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    const messages = await this.getMessageHistory(sessionId);

    return {
      session,
      messages,
    };
  }

  /**
   * 生成标题辅助方法
   */
  private generateTitleFromMessage(message: string): string {
    const trimmed = message.trim();
    return trimmed.length > 20 ? trimmed.substring(0, 20) + '...' : trimmed;
  }
}
