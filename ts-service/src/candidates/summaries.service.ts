import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  CandidateSummary,
  CandidateDocument,
  SampleCandidate,
} from "../entities";
import { SummaryStatus } from "../common/enums";
import { AuthUser } from "../auth/auth.types";
import { QueueService } from "../queue/queue.service";
import { SummaryJobData } from "./summary-processor.service";

@Injectable()
export class SummariesService {
  constructor(
    @InjectRepository(CandidateSummary)
    private readonly summariesRepository: Repository<CandidateSummary>,
    @InjectRepository(CandidateDocument)
    private readonly documentsRepository: Repository<CandidateDocument>,
    @InjectRepository(SampleCandidate)
    private readonly candidatesRepository: Repository<SampleCandidate>,
    private readonly queueService: QueueService,
  ) {}

  async generateSummary(
    candidateId: string,
    authUser: AuthUser,
  ): Promise<{ id: string; status: string; candidateId: string }> {
    const documentsCount = await this.documentsRepository.count({
      where: { candidateId },
    });

    if (documentsCount === 0) {
      throw new NotFoundException("No documents found for this candidate");
    }

    const summary = this.summariesRepository.create({
      candidateId,
      status: SummaryStatus.PENDING,
    });
    const savedSummary = await this.summariesRepository.save(summary);

    const jobData: SummaryJobData = {
      summaryId: savedSummary.id,
      candidateId,
      workspaceId: authUser.workspaceId,
    };

    this.queueService.enqueue("SUMMARY_GENERATE", jobData);

    return {
      id: savedSummary.id,
      status: savedSummary.status,
      candidateId: savedSummary.candidateId,
    };
  }

  async getSummariesForCandidate(
    candidateId: string,
    authUser: AuthUser,
  ): Promise<CandidateSummary[]> {
    // Verify candidate exists and belongs to workspace
    const candidate = await this.candidatesRepository.findOne({
      where: { id: candidateId, workspaceId: authUser.workspaceId },
    });

    if (!candidate) {
      throw new NotFoundException("Candidate not found or access denied");
    }

    return this.summariesRepository.find({
      where: { candidateId },
      order: { createdAt: "DESC" },
    });
  }

  async getSummaryById(
    candidateId: string,
    summaryId: string,
  ): Promise<CandidateSummary> {
    const summary = await this.summariesRepository.findOne({
      where: { id: summaryId, candidateId },
    });

    if (!summary) {
      throw new NotFoundException(
        "Summary not found or does not belong to this candidate",
      );
    }

    return summary;
  }
}
