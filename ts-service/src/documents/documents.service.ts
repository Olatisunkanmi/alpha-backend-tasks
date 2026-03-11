import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CandidateDocument, SampleCandidate } from "../entities";
import { UploadDocumentDto } from "../candidates/dto";
import { AuthUser } from "../auth/auth.types";
import { RequestWithUser } from "src/common/interfaces";
import { CreateDocumentDto } from "./dto/create-document.dto";
import { FileType } from "src/common/enums";

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(CandidateDocument)
    private readonly documentsRepository: Repository<CandidateDocument>,
    @InjectRepository(SampleCandidate)
    private readonly candidatesRepository: Repository<SampleCandidate>,
  ) {}

  async uploadDocument(
    candidateId: string,
    req: RequestWithUser,
    dto: UploadDocumentDto,
    // file: Express.Multer.File,
  ): Promise<CandidateDocument | void> {
    const storageKey = `uploads/${req.user.workspaceId}/${candidateId}/${Date.now()}-${dto.fileName}`;

    return this.createDocument({
      candidateId,
      documentType: dto.documentType,
      fileName: dto.fileName,
      rawText: dto.rawText,
      storageKey,
    });
  }

  private async createDocument(
    dto: CreateDocumentDto,
  ): Promise<CandidateDocument | void> {
    const document = this.documentsRepository.create({
      documentType: dto.documentType,
      fileName: dto.fileName,
      storageKey: dto.storageKey,
      rawText: dto.rawText,
      candidate: {
        id: dto.candidateId,
      },
    });
    return this.documentsRepository.save(document);
  }

  async getDocumentsForCandidate(
    candidateId: string,
    authUser?: AuthUser,
  ): Promise<CandidateDocument[]> {
    return this.documentsRepository.find({
      where: { candidateId },
      order: { uploadedAt: "DESC" },
    });
  }

  async fetchDocumentTexts(candidateId: string): Promise<string[]> {
    const documents = await this.documentsRepository.find({
      where: { candidateId },
      order: { uploadedAt: "ASC" },
    });

    return documents.map((d) => d.rawText);
  }

  async getCandidatesForWorkspace(
    req: RequestWithUser,
  ): Promise<SampleCandidate[]> {
    return this.candidatesRepository.find({
      where: { workspaceId: req.user.workspaceId },
      order: { createdAt: "DESC" },
    });
  }
}
