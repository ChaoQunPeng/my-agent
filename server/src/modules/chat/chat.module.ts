import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatRepository } from './chat.repository';
import { SessionModule } from '../session/session.module';
// 导入 CharacterModule 以使用 CharacterService
import { CharacterModule } from '../character/character.module';

@Module({
  imports: [SessionModule, CharacterModule],
  controllers: [ChatController],
  providers: [ChatService, ChatRepository],
})
export class ChatModule {}
