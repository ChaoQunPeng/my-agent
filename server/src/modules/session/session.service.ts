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
  constructor(
    @InjectModel(Session.name) private sessionModel: Model<SessionDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
  ) {}

  /**
   * 生成会话标题（基于第一条用户消息）
   */
  private generateTitleFromMessage(message: string): string {
    // 简单实现：截取前20个字符作为标题
    const trimmed = message.trim();
    return trimmed.length > 20 ? trimmed.substring(0, 20) + '...' : trimmed;
  }

  /**
   * 创建新会话
   */
  async create(createSessionDto: CreateSessionDto): Promise<Session> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const createdSession = new this.sessionModel({
      sessionId,
      title: createSessionDto.title || '新会话',
      summary: createSessionDto.summary || '',
    });

    return createdSession.save();
  }

  /**
   * 获取所有会话列表（按更新时间倒序）
   */
  async findAll(): Promise<Session[]> {
    return this.sessionModel.find().sort({ updatedAt: -1 }).exec();
  }

  /**
   * 根据 ID 获取会话详情（包含消息历史）
   */
  async findOne(sessionId: string): Promise<{
    session: Session;
    messages: Message[];
  }> {
    const session = await this.sessionModel.findOne({ sessionId }).exec();

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    const messages = await this.messageModel
      .find({ sessionId })
      .sort({ timestamp: 1 })
      .exec();

    return { session, messages };
  }

  /**
   * 更新会话信息
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
   * 删除会话及其所有消息
   */
  async remove(sessionId: string): Promise<void> {
    const session = await this.sessionModel
      .findOneAndDelete({ sessionId })
      .exec();

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    // 删除关联的所有消息
    await this.messageModel.deleteMany({ sessionId }).exec();
  }

  /**
   * 添加消息到会话
   */
  async addMessage(
    sessionId: string,
    role: string,
    content: string,
  ): Promise<Message> {
    // 验证会话是否存在
    const session = await this.sessionModel.findOne({ sessionId }).exec();
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    // 如果是第一条用户消息，自动生成标题
    if (role === 'user') {
      const messageCount = await this.messageModel
        .countDocuments({ sessionId })
        .exec();
      if (messageCount === 0) {
        const title = this.generateTitleFromMessage(content);
        await this.sessionModel
          .findOneAndUpdate({ sessionId }, { $set: { title } })
          .exec();
      }
    }

    const message = new this.messageModel({
      sessionId,
      role,
      content,
      timestamp: new Date(),
    });

    return message.save();
  }

  /**
   * 获取会话的消息历史（转换为 OpenAI 格式）
   */
  async getMessageHistory(
    sessionId: string,
  ): Promise<OpenAI.Chat.Completions.ChatCompletionMessageParam[]> {
    const messages = await this.messageModel
      .find({ sessionId })
      .sort({ timestamp: 1 })
      .exec();

    return messages.map((msg) => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    }));
  }

  /**
   * 清除会话的所有消息
   */
  async clearMessages(sessionId: string): Promise<void> {
    await this.messageModel.deleteMany({ sessionId }).exec();
  }
}
