import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NovelCharacterController } from './novel-character.controller';
import { NovelCharacterService } from './novel-character.service';
import {
  NovelCharacter,
  NovelCharacterSchema,
} from './schemas/novel-character.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: NovelCharacter.name, schema: NovelCharacterSchema },
    ]),
  ],
  controllers: [NovelCharacterController],
  providers: [NovelCharacterService],
  exports: [NovelCharacterService],
})
export class NovelCharacterModule {}
