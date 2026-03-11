import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { QueueService } from './queue.service';
import { SummaryConsumer } from './consumer';
import { SummaryProcessorService } from '../candidates/summary-processor.service';
import { CandidateSummary, CandidateDocument } from '../entities';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CandidateSummary, CandidateDocument]),
    LlmModule,
  ],
  providers: [QueueService, SummaryConsumer, SummaryProcessorService],
  exports: [QueueService],
})
export class QueueModule {}
