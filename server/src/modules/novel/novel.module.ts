import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NovelController } from './novel.controller';
import { NovelService } from './novel.service';
import { Novel, NovelSchema } from './schemas/novel.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Novel.name, schema: NovelSchema }]),
  ],
  controllers: [NovelController],
  providers: [NovelService],
  exports: [NovelService],
})
export class NovelModule {}
