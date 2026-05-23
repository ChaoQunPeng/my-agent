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
    ]),
    OpenaiModule,
  ],
  controllers: [NovelOutlineController],
  providers: [NovelOutlineService, SplitterService, OutlineGeneratorService],
  exports: [NovelOutlineService],
})
export class NovelOutlineModule {}
