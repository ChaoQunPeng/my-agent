import { Injectable } from '@nestjs/common';

/**
 * ChatRepository — 数据访问层（预留骨架）
 *
 * 当前 ChatService 使用内存存储会话，接入 MongoDB 后：
 * 1. 取消注释 @InjectModel 相关代码
 * 2. 在 chat.module.ts 的 MongooseModule.forFeature 中注册 ChatSession
 * 3. 将 ChatService 中的 session 操作替换为调用此 Repository
 */
@Injectable()
export class ChatRepository {
  // constructor(
  //   @InjectModel(ChatSession.name)
  //   private readonly sessionModel: Model<ChatSessionDocument>,
  // ) {}

  // async findBySessionId(sessionId: string): Promise<ChatSessionDocument | null> {
  //   return this.sessionModel.findOne({ sessionId }).exec();
  // }

  // async save(sessionId: string, history: Record<string, unknown>[], title?: string) {
  //   return this.sessionModel.findOneAndUpdate(
  //     { sessionId },
  //     { history, title },
  //     { upsert: true, new: true },
  //   ).exec();
  // }

  // async delete(sessionId: string) {
  //   return this.sessionModel.findOneAndDelete({ sessionId }).exec();
  // }
}

