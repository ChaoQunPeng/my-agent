import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatRepository } from './chat.repository';
import { SessionModule } from '../session/session.module';
// 导入 CharacterModule 以使用 CharacterService
import { CharacterModule } from '../character/character.module';
// 导入 FileReaderModule 以使用 FileReaderService
import { FileReaderModule } from '../../shared/file-reader/file-reader.module';
import { NovelCharacterModule } from '../novel-character/novel-character.module';
import { NovelOrganizationModule } from '../novel-organization/novel-organization.module';

@Module({
  imports: [
    SessionModule,
    CharacterModule,
    FileReaderModule,
    NovelCharacterModule,
    NovelOrganizationModule,
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatRepository],
})
export class ChatModule {}
