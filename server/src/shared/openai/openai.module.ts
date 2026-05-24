import { Global, Module } from '@nestjs/common';
import { OpenaiService } from './openai.service';
import { StructuredConsolidationService } from './structured-consolidation.service';

@Global()
@Module({
  providers: [OpenaiService, StructuredConsolidationService],
  exports: [OpenaiService, StructuredConsolidationService],
})
export class OpenaiModule {}
