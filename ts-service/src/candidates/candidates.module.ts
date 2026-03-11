import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CandidatesController } from "./candidates.controller";
import { DocumentsService } from "../documents/documents.service";
import { SummariesService } from "./summaries.service";
import { SummaryProcessorService } from "./summary-processor.service";
import {
  CandidateDocument,
  CandidateSummary,
  SampleCandidate,
  SampleWorkspace,
  Recruiter,
} from "../entities";
import { QueueModule } from "../queue/queue.module";
import { LlmModule } from "../llm/llm.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CandidateDocument,
      CandidateSummary,
      SampleCandidate,
      SampleWorkspace,
      Recruiter,
    ]),
    QueueModule,
    LlmModule,
  ],
  controllers: [CandidatesController],
  providers: [DocumentsService, SummariesService, SummaryProcessorService],
  exports: [DocumentsService, SummariesService, SummaryProcessorService],
})
export class CandidatesModule {}
