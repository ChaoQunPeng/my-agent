import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NovelContextController } from './novel-context.controller';
import { NovelContextService } from './novel-context.service';
import { NovelConfig, NovelConfigSchema } from './schemas/novel-config.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: NovelConfig.name, schema: NovelConfigSchema }]),
  ],
  controllers: [NovelContextController],
  providers: [NovelContextService],
  exports: [NovelContextService],
})
export class NovelContextModule {}
