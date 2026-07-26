import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CharacterController } from './character.controller';
import { CharacterService } from './character.service';
import { Character, CharacterSchema } from './schemas/character.schema';

/**
 * 人物模块
 * 提供人物信息的完整功能模块
 */
@Module({
  imports: [
    // 注册Character模型到Mongoose
    MongooseModule.forFeature([
      { name: Character.name, schema: CharacterSchema },
    ]),
  ],
  controllers: [CharacterController],
  providers: [CharacterService],
  exports: [CharacterService], // 导出服务以便其他模块使用
})
export class CharacterModule {}
