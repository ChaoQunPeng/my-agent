import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CharacterController } from './character.controller';
import { CharacterService } from './character.service';
import { Character, CharacterSchema } from './schemas/character.schema';
// 导入Session模块以使用SessionModel
import { SessionModule } from '../session/session.module';
import { Session, SessionSchema } from '../session/schemas/session.schema';

/**
 * 人物模块
 * 提供人物信息的完整功能模块
 * 需要导入SessionModule以管理人物与会话的绑定关系
 */
@Module({
  imports: [
    // 注册Character模型到Mongoose
    MongooseModule.forFeature([
      { name: Character.name, schema: CharacterSchema },
    ]),
    // 注册Session模型以支持人物-会话绑定功能
    MongooseModule.forFeature([{ name: Session.name, schema: SessionSchema }]),
    // 导入SessionModule（如果需要访问SessionService）
    SessionModule,
  ],
  controllers: [CharacterController],
  providers: [CharacterService],
  exports: [CharacterService], // 导出服务以便其他模块使用
})
export class CharacterModule {}
