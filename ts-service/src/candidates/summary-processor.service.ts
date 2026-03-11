import { Injectable, Inject, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CandidateSummary, CandidateDocument } from "../entities";
import { SummaryStatus } from "../common/enums";
import {
  SUMMARIZATION_PROVIDER,
  SummarizationProvider,
  CandidateSummaryInput,
} from "../llm/summarization-provider.interface";

export interface SummaryJobData {
  summaryId: string;
  candidateId: string;
  workspaceId: string;
}

@Injectable()
export class SummaryProcessorService {
  private readonly logger = new Logger(SummaryProcessorService.name);

  constructor(
    @InjectRepository(CandidateSummary)
    private readonly summariesRepository: Repository<CandidateSummary>,
    @InjectRepository(CandidateDocument)
    private readonly documentsRepository: Repository<CandidateDocument>,
    @Inject(SUMMARIZATION_PROVIDER)
    private readonly summarizationProvider: SummarizationProvider,
  ) {}

  async processSummaryGeneration(jobData: SummaryJobData): Promise<void> {
    const { summaryId, candidateId, workspaceId } = jobData;

    this.logger.log(
      `Processing summary generation for candidate ${candidateId}, summary ${summaryId}`,
    );

    try {
      const summary = await this.summariesRepository.findOne({
        where: { id: summaryId, candidateId, status: SummaryStatus.PENDING },
      });

      if (!summary) {
        throw new Error(
          `Summary ${summaryId} not found or not in pending status`,
        );
      }

      const documents = await this.documentsRepository.find({
        where: { candidateId },
        order: { uploadedAt: "ASC" },
      });

      if (documents.length === 0) {
        throw new Error(`No documents found for candidate ${candidateId}`);
      }

      const summaryInput: CandidateSummaryInput = {
        candidateId,
        documents: documents.map((doc) => doc.rawText),
      };

      this.logger.log(`Calling LLM provider for candidate ${candidateId}`);
      const result =
        await this.summarizationProvider.generateCandidateSummary(summaryInput);

      await this.summariesRepository.update(summaryId, {
        status: SummaryStatus.COMPLETED,
        score: result.score,
        strengths: result.strengths.join("\n"),
        concerns: result.concerns.join("\n"),
        summary: result.summary,
        recommendedDecision: result.recommendedDecision,
        provider: "gemini",
        promptVersion: "v1.0",
        errorMessage: null,
        updatedAt: new Date(),
      });

      this.logger.log(
        `Successfully completed summary generation for candidate ${candidateId}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to generate summary for candidate ${candidateId}:`,
        error,
      );

      await this.summariesRepository.update(summaryId, {
        status: SummaryStatus.FAILED,
        errorMessage: "Failed to generate summary for document",
        updatedAt: new Date(),
      });
    }
  }
}
