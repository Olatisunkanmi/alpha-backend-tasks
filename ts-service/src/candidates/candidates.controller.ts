import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
} from "@nestjs/common";
import { FakeAuthGuard, FakeCandidateGuard } from "../auth/fake-auth.guard";
import { DocumentsService } from "../documents/documents.service";
import { SummariesService } from "./summaries.service";
import { UploadDocumentDto, GenerateSummaryDto } from "./dto";
import { RequestWithUser } from "src/common/interfaces";

@Controller("candidates")
@UseGuards(FakeAuthGuard, FakeCandidateGuard)
export class CandidatesController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly summariesService: SummariesService,
  ) {}

  @Get("")
  async fetchAllCandidates(@Req() req: RequestWithUser) {
    return this.documentsService.getCandidatesForWorkspace(req);
  }

  @Post("/:candidateId/documents")
  async uploadDocument(
    @Param("candidateId") candidateId: string,
    @Body() uploadDocumentDto: UploadDocumentDto,
    @Req() req: RequestWithUser,
  ) {
    return this.documentsService.uploadDocument(
      candidateId,
      req,
      uploadDocumentDto,
    );
  }

  @Get("/:candidateId/documents")
  async getDocuments(
    @Param("candidateId") candidateId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.documentsService.getDocumentsForCandidate(
      candidateId,
      req.user,
    );
  }

  @Post("/:candidateId/summaries/generate")
  async generateSummary(
    @Param("candidateId") candidateId: string,
    @Body() generateSummaryDto: GenerateSummaryDto,
    @Req() req: RequestWithUser,
  ) {
    return this.summariesService.generateSummary(candidateId, req.user);
  }

  @Get("/:candidateId/summaries")
  async getSummaries(
    @Param("candidateId") candidateId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.summariesService.getSummariesForCandidate(
      candidateId,
      req.user,
    );
  }
  @Get("/:candidateId/summaries/:summaryId")
  async getSummary(
    @Param("candidateId") candidateId: string,
    @Param("summaryId") summaryId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.summariesService.getSummaryById(candidateId, summaryId);
  }
}
