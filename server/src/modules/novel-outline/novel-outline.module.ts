import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NovelOutlineController } from './novel-outline.controller';
import { NovelOutlineService } from './novel-outline.service';
import { SplitterService } from './splitter.service';
import { OutlineGeneratorService } from './outline-generator.service';
import {
  NovelSplitJob,
  NovelSplitJobSchema,
} from './schemas/novel-split-job.schema';
import {
  NovelOutline,
  NovelOutlineSchema,
} from './schemas/novel-outline.schema';
import {
  NovelWorldView,
  NovelWorldViewSchema,
} from './schemas/novel-world-view.schema';
import {
  NovelCharacters,
  NovelCharactersSchema,
} from './schemas/novel-characters.schema';
import {
  NovelEvents,
  NovelEventsSchema,
} from './schemas/novel-events.schema';
import { OpenaiModule } from '../../shared/openai/openai.module';

/**
 * 小说大纲生成模块
 * - 上传 txt → 拆分成小文件 → 逐块调大模型增量更新大纲
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: NovelSplitJob.name, schema: NovelSplitJobSchema },
      { name: NovelOutline.name, schema: NovelOutlineSchema },
      { name: NovelWorldView.name, schema: NovelWorldViewSchema },
      { name: NovelCharacters.name, schema: NovelCharactersSchema },
      { name: NovelEvents.name, schema: NovelEventsSchema },
    ]),
    OpenaiModule,
  ],
  controllers: [NovelOutlineController],
  providers: [NovelOutlineService, SplitterService, OutlineGeneratorService],
  exports: [NovelOutlineService],
})
export class NovelOutlineModule {}
