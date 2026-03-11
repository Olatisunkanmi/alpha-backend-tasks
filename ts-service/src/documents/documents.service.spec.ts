import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DocumentsService } from "./documents.service";
import { CandidateDocument, SampleCandidate } from "../entities";
import { RequestWithUser } from "../common/interfaces";
import { AuthUser } from "../auth/auth.types";
import { UploadDocumentDto } from "../candidates/dto";
import { DocumentType } from "../common/enums";

describe("DocumentsService", () => {
  let service: DocumentsService;
  let candidatesRepository: jest.Mocked<Repository<SampleCandidate>>;
  let documentsRepository: jest.Mocked<Repository<CandidateDocument>>;

  beforeEach(async () => {
    const mockCandidatesRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    const mockDocumentsRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        {
          provide: getRepositoryToken(SampleCandidate),
          useValue: mockCandidatesRepository,
        },
        {
          provide: getRepositoryToken(CandidateDocument),
          useValue: mockDocumentsRepository,
        },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
    candidatesRepository = module.get(getRepositoryToken(SampleCandidate));
    documentsRepository = module.get(getRepositoryToken(CandidateDocument));
  });

  describe("getCandidatesForWorkspace", () => {
    it("should return candidates for the workspace ordered by createdAt DESC", async () => {
      // Arrange
      const workspaceId = "workspace-123";
      const authUser: AuthUser = { userId: "user-123", workspaceId };
      const req: RequestWithUser = { user: authUser } as RequestWithUser;

      const mockCandidates: SampleCandidate[] = [
        {
          id: "candidate-1",
          workspaceId,
          fullName: "John Doe",
          email: "john@example.com",
          createdAt: new Date("2024-01-02"),
          workspace: {} as any,
        },
        {
          id: "candidate-2",
          workspaceId,
          fullName: "Jane Smith",
          email: "jane@example.com",
          createdAt: new Date("2024-01-01"),
          workspace: {} as any,
        },
      ];

      candidatesRepository.find.mockResolvedValue(mockCandidates);

      const result = await service.getCandidatesForWorkspace(req);

      expect(result).toEqual(mockCandidates);
      expect(candidatesRepository.find).toHaveBeenCalledWith({
        where: { workspaceId },
        order: { createdAt: "DESC" },
      });
      expect(candidatesRepository.find).toHaveBeenCalledTimes(1);
    });

    it("should return empty array when no candidates exist for workspace", async () => {
      const workspaceId = "empty-workspace";
      const authUser: AuthUser = { userId: "user-456", workspaceId };
      const req: RequestWithUser = { user: authUser } as RequestWithUser;

      candidatesRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.getCandidatesForWorkspace(req);

      // Assert
      expect(result).toEqual([]);
      expect(candidatesRepository.find).toHaveBeenCalledWith({
        where: { workspaceId },
        order: { createdAt: "DESC" },
      });
    });

    it("should throw error when repository fails", async () => {
      const workspaceId = "workspace-error";
      const authUser: AuthUser = { userId: "user-789", workspaceId };
      const req: RequestWithUser = { user: authUser } as RequestWithUser;

      const databaseError = new Error("Database connection failed");
      candidatesRepository.find.mockRejectedValue(databaseError);

      // Act & Assert
      await expect(service.getCandidatesForWorkspace(req)).rejects.toThrow(
        "Database connection failed",
      );
      expect(candidatesRepository.find).toHaveBeenCalledWith({
        where: { workspaceId },
        order: { createdAt: "DESC" },
      });
    });
  });

  describe("uploadDocument", () => {
    it("should create and save a document successfully", async () => {
      // Arrange
      const candidateId = "candidate-123";
      const workspaceId = "workspace-456";
      const authUser: AuthUser = { userId: "user-789", workspaceId };
      const req: RequestWithUser = { user: authUser } as RequestWithUser;

      const uploadDocumentDto: UploadDocumentDto = {
        documentType: DocumentType.RESUME,
        fileName: "resume.pdf",
        rawText: "John Doe Resume Content...",
      };

      const expectedDocument: Partial<CandidateDocument> = {
        id: "doc-123",
        candidateId,
        documentType: DocumentType.RESUME,
        fileName: "resume.pdf",
        rawText: "John Doe Resume Content...",
        storageKey: expect.stringContaining(
          `uploads/${workspaceId}/${candidateId}/`,
        ),
        uploadedAt: new Date(),
      };

      // Mock the create and save methods
      documentsRepository.create.mockReturnValue(
        expectedDocument as CandidateDocument,
      );
      documentsRepository.save.mockResolvedValue(
        expectedDocument as CandidateDocument,
      );

      // Act
      const result = await service.uploadDocument(
        candidateId,
        req,
        uploadDocumentDto,
      );

      // Assert
      expect(result).toEqual(expectedDocument);
      expect(documentsRepository.create).toHaveBeenCalledWith({
        documentType: DocumentType.RESUME,
        fileName: "resume.pdf",
        storageKey: expect.stringContaining(
          `uploads/${workspaceId}/${candidateId}/`,
        ),
        rawText: "John Doe Resume Content...",
        candidate: { id: candidateId },
      });
      expect(documentsRepository.save).toHaveBeenCalledWith(expectedDocument);
      expect(documentsRepository.create).toHaveBeenCalledTimes(1);
      expect(documentsRepository.save).toHaveBeenCalledTimes(1);
    });

    it("should generate correct storage key with timestamp and workspace structure", async () => {
      // Arrange
      const candidateId = "candidate-456";
      const workspaceId = "workspace-789";
      const authUser: AuthUser = { userId: "user-123", workspaceId };
      const req: RequestWithUser = { user: authUser } as RequestWithUser;

      const uploadDocumentDto: UploadDocumentDto = {
        documentType: DocumentType.COVER_LETTER,
        fileName: "cover-letter.docx",
        rawText: "Dear Hiring Manager...",
      };

      const mockDocument = {} as CandidateDocument;
      documentsRepository.create.mockReturnValue(mockDocument);
      documentsRepository.save.mockResolvedValue(mockDocument);

      // Act
      await service.uploadDocument(candidateId, req, uploadDocumentDto);

      // Assert
      expect(documentsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          storageKey: expect.stringMatching(
            new RegExp(
              `^uploads/${workspaceId}/${candidateId}/\\d+-${uploadDocumentDto.fileName}$`,
            ),
          ),
        }),
      );
    });

    it("should throw error when repository save fails", async () => {
      // Arrange
      const candidateId = "candidate-error";
      const workspaceId = "workspace-error";
      const authUser: AuthUser = { userId: "user-error", workspaceId };
      const req: RequestWithUser = { user: authUser } as RequestWithUser;

      const uploadDocumentDto: UploadDocumentDto = {
        documentType: DocumentType.PORTFOLIO,
        fileName: "portfolio.pdf",
        rawText: "Portfolio content...",
      };

      const mockDocument = {} as CandidateDocument;
      documentsRepository.create.mockReturnValue(mockDocument);

      const saveError = new Error("Database save failed");
      documentsRepository.save.mockRejectedValue(saveError);

      // Act & Assert
      await expect(
        service.uploadDocument(candidateId, req, uploadDocumentDto),
      ).rejects.toThrow("Database save failed");

      expect(documentsRepository.create).toHaveBeenCalledTimes(1);
      expect(documentsRepository.save).toHaveBeenCalledWith(mockDocument);
    });
  });

  describe("getDocumentsForCandidate", () => {
    it("should return documents for a candidate ordered by uploadedAt DESC", async () => {
      // Arrange
      const candidateId = "candidate-123";
      const authUser: AuthUser = {
        userId: "user-456",
        workspaceId: "workspace-789",
      };

      const mockDocuments: CandidateDocument[] = [
        {
          id: "doc-1",
          candidateId,
          documentType: DocumentType.RESUME,
          fileName: "resume.pdf",
          storageKey: "uploads/workspace-789/candidate-123/resume.pdf",
          rawText: "Resume content...",
          uploadedAt: new Date("2024-01-03"),
          candidate: {} as any,
        },
        {
          id: "doc-2",
          candidateId,
          documentType: DocumentType.COVER_LETTER,
          fileName: "cover-letter.docx",
          storageKey: "uploads/workspace-789/candidate-123/cover-letter.docx",
          rawText: "Cover letter content...",
          uploadedAt: new Date("2024-01-02"),
          candidate: {} as any,
        },
        {
          id: "doc-3",
          candidateId,
          documentType: DocumentType.PORTFOLIO,
          fileName: "portfolio.pdf",
          storageKey: "uploads/workspace-789/candidate-123/portfolio.pdf",
          rawText: "Portfolio content...",
          uploadedAt: new Date("2024-01-01"),
          candidate: {} as any,
        },
      ];

      documentsRepository.find.mockResolvedValue(mockDocuments);

      // Act
      const result = await service.getDocumentsForCandidate(
        candidateId,
        authUser,
      );

      // Assert
      expect(result).toEqual(mockDocuments);
      expect(documentsRepository.find).toHaveBeenCalledWith({
        where: { candidateId },
        order: { uploadedAt: "DESC" },
      });
      expect(documentsRepository.find).toHaveBeenCalledTimes(1);
    });

    it("should return documents for a candidate without authUser parameter", async () => {
      // Arrange
      const candidateId = "candidate-456";

      const mockDocuments: CandidateDocument[] = [
        {
          id: "doc-4",
          candidateId,
          documentType: DocumentType.TRANSCRIPT,
          fileName: "transcript.pdf",
          storageKey: "uploads/workspace-123/candidate-456/transcript.pdf",
          rawText: "Transcript content...",
          uploadedAt: new Date("2024-01-05"),
          candidate: {} as any,
        },
      ];

      documentsRepository.find.mockResolvedValue(mockDocuments);

      // Act
      const result = await service.getDocumentsForCandidate(candidateId);

      // Assert
      expect(result).toEqual(mockDocuments);
      expect(documentsRepository.find).toHaveBeenCalledWith({
        where: { candidateId },
        order: { uploadedAt: "DESC" },
      });
    });

    it("should return empty array when no documents exist for candidate", async () => {
      // Arrange
      const candidateId = "candidate-no-docs";
      const authUser: AuthUser = {
        userId: "user-999",
        workspaceId: "workspace-999",
      };

      documentsRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.getDocumentsForCandidate(
        candidateId,
        authUser,
      );

      // Assert
      expect(result).toEqual([]);
      expect(documentsRepository.find).toHaveBeenCalledWith({
        where: { candidateId },
        order: { uploadedAt: "DESC" },
      });
    });

    it("should throw error when repository find fails", async () => {
      // Arrange
      const candidateId = "candidate-error";
      const authUser: AuthUser = {
        userId: "user-error",
        workspaceId: "workspace-error",
      };

      const findError = new Error("Database query failed");
      documentsRepository.find.mockRejectedValue(findError);

      // Act & Assert
      await expect(
        service.getDocumentsForCandidate(candidateId, authUser),
      ).rejects.toThrow("Database query failed");

      expect(documentsRepository.find).toHaveBeenCalledWith({
        where: { candidateId },
        order: { uploadedAt: "DESC" },
      });
    });
  });
});
