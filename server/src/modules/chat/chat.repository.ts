/**
 * ChatRepository - 聊天数据访问层(当前未使用)
 *
 * 说明:
 * - 当前 ChatService 使用内存存储会话
 * - SessionModule 已提供完整的 MongoDB 持久化方案
 * - 此 Repository 作为未来扩展的预留位置
 *
 * 如需启用数据库存储,请:
 * 1. 在 chat.module.ts 中注册 MongooseModule.forFeature
 * 2. 取消注释下方的代码
 * 3. 修改 ChatService 调用此 Repository
 */
import { Injectable } from '@nestjs/common';

@Injectable()
export class ChatRepository {
  // 示例:未来可以添加自定义的查询逻辑
  // constructor(
  //   @InjectModel('ChatSession')
  //   private readonly sessionModel: Model<any>,
  // ) {}
  // async findBySessionId(sessionId: string): Promise<any | null> {
  //   return this.sessionModel.findOne({ sessionId }).exec();
  // }
  // async save(sessionId: string, data: any) {
  //   return this.sessionModel.findOneAndUpdate(
  //     { sessionId },
  //     { $set: data },
  //     { upsert: true, new: true },
  //   ).exec();
  // }
}
