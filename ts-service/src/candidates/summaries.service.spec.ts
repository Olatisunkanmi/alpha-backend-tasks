import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { NotFoundException } from "@nestjs/common";
import { SummariesService } from "./summaries.service";
import { CandidateSummary, CandidateDocument, SampleCandidate } from "../entities";
import { AuthUser } from "../auth/auth.types";
import { QueueService } from "../queue/queue.service";
import { SummaryStatus } from "../common/enums";

describe("SummariesService", () => {
  let service: SummariesService;
  let summariesRepository: jest.Mocked<Repository<CandidateSummary>>;
  let documentsRepository: jest.Mocked<Repository<CandidateDocument>>;
  let candidatesRepository: jest.Mocked<Repository<SampleCandidate>>;
  let queueService: jest.Mocked<QueueService>;

  beforeEach(async () => {
    const mockSummariesRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    };

    const mockDocumentsRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    };

    const mockCandidatesRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    const mockQueueService = {
      enqueue: jest.fn(),
      getQueuedJobs: jest.fn(),
      removeJob: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SummariesService,
        {
          provide: getRepositoryToken(CandidateSummary),
          useValue: mockSummariesRepository,
        },
        {
          provide: getRepositoryToken(CandidateDocument),
          useValue: mockDocumentsRepository,
        },
        {
          provide: getRepositoryToken(SampleCandidate),
          useValue: mockCandidatesRepository,
        },
        {
          provide: QueueService,
          useValue: mockQueueService,
        },
      ],
    }).compile();

    service = module.get<SummariesService>(SummariesService);
    summariesRepository = module.get(getRepositoryToken(CandidateSummary));
    documentsRepository = module.get(getRepositoryToken(CandidateDocument));
    candidatesRepository = module.get(getRepositoryToken(SampleCandidate));
    queueService = module.get(QueueService);
  });

  describe("getSummariesForCandidate", () => {
    it("should return summaries for a candidate in the same workspace ordered by createdAt DESC", async () => {
      // Arrange
      const candidateId = "candidate-123";
      const workspaceId = "workspace-456";
      const authUser: AuthUser = { userId: "user-789", workspaceId };

      const mockCandidate: SampleCandidate = {
        id: candidateId,
        workspaceId,
        fullName: "John Doe",
        email: "john@example.com",
        createdAt: new Date(),
        workspace: {} as any,
      };

      const mockSummaries: CandidateSummary[] = [
        {
          id: "summary-1",
          candidateId,
          status: SummaryStatus.COMPLETED,
          score: 85,
          strengths: "Strong technical skills\nExcellent communication",
          concerns: "Limited leadership experience",
          summary: "A promising candidate with strong technical background",
          recommendedDecision: "advance",
          provider: "gemini",
          promptVersion: "v1.0",
          errorMessage: null,
          createdAt: new Date("2024-01-03"),
          updatedAt: new Date("2024-01-03"),
          candidate: mockCandidate,
        },
        {
          id: "summary-2",
          candidateId,
          status: SummaryStatus.FAILED,
          score: null,
          strengths: null,
          concerns: null,
          summary: null,
          recommendedDecision: null,
          provider: "gemini",
          promptVersion: "v1.0",
          errorMessage: "LLM API timeout",
          createdAt: new Date("2024-01-02"),
          updatedAt: new Date("2024-01-02"),
          candidate: mockCandidate,
        },
        {
          id: "summary-3",
          candidateId,
          status: SummaryStatus.PENDING,
          score: null,
          strengths: null,
          concerns: null,
          summary: null,
          recommendedDecision: null,
          provider: null,
          promptVersion: null,
          errorMessage: null,
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
          candidate: mockCandidate,
        },
      ];

      candidatesRepository.findOne.mockResolvedValue(mockCandidate);
      summariesRepository.find.mockResolvedValue(mockSummaries);

      // Act
      const result = await service.getSummariesForCandidate(candidateId, authUser);

      // Assert
      expect(result).toEqual(mockSummaries);
      expect(candidatesRepository.findOne).toHaveBeenCalledWith({
        where: { id: candidateId, workspaceId },
      });
      expect(summariesRepository.find).toHaveBeenCalledWith({
        where: { candidateId },
        order: { createdAt: "DESC" },
      });
      expect(candidatesRepository.findOne).toHaveBeenCalledTimes(1);
      expect(summariesRepository.find).toHaveBeenCalledTimes(1);
    });

    it("should return empty array when candidate has no summaries", async () => {
      // Arrange
      const candidateId = "candidate-no-summaries";
      const workspaceId = "workspace-456";
      const authUser: AuthUser = { userId: "user-789", workspaceId };

      const mockCandidate: SampleCandidate = {
        id: candidateId,
        workspaceId,
        fullName: "Jane Smith",
        email: "jane@example.com",
        createdAt: new Date(),
        workspace: {} as any,
      };

      candidatesRepository.findOne.mockResolvedValue(mockCandidate);
      summariesRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.getSummariesForCandidate(candidateId, authUser);

      // Assert
      expect(result).toEqual([]);
      expect(candidatesRepository.findOne).toHaveBeenCalledWith({
        where: { id: candidateId, workspaceId },
      });
      expect(summariesRepository.find).toHaveBeenCalledWith({
        where: { candidateId },
        order: { createdAt: "DESC" },
      });
    });

    it("should throw NotFoundException when candidate does not exist", async () => {
      // Arrange
      const candidateId = "nonexistent-candidate";
      const workspaceId = "workspace-456";
      const authUser: AuthUser = { userId: "user-789", workspaceId };

      candidatesRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getSummariesForCandidate(candidateId, authUser)
      ).rejects.toThrow(NotFoundException);
      
      await expect(
        service.getSummariesForCandidate(candidateId, authUser)
      ).rejects.toThrow("Candidate not found or access denied");

      expect(candidatesRepository.findOne).toHaveBeenCalledWith({
        where: { id: candidateId, workspaceId },
      });
      expect(summariesRepository.find).not.toHaveBeenCalled();
    });

    it("should throw NotFoundException when candidate belongs to different workspace", async () => {
      // Arrange
      const candidateId = "candidate-different-workspace";
      const authUserWorkspaceId = "workspace-456";
      const candidateWorkspaceId = "workspace-789"; // Different workspace
      const authUser: AuthUser = { userId: "user-123", workspaceId: authUserWorkspaceId };

      // Repository returns null because candidate doesn't match workspace filter
      candidatesRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getSummariesForCandidate(candidateId, authUser)
      ).rejects.toThrow(NotFoundException);

      await expect(
        service.getSummariesForCandidate(candidateId, authUser)
      ).rejects.toThrow("Candidate not found or access denied");

      expect(candidatesRepository.findOne).toHaveBeenCalledWith({
        where: { id: candidateId, workspaceId: authUserWorkspaceId },
      });
      expect(summariesRepository.find).not.toHaveBeenCalled();
    });

    it("should throw error when summaries repository fails", async () => {
      // Arrange
      const candidateId = "candidate-repo-error";
      const workspaceId = "workspace-456";
      const authUser: AuthUser = { userId: "user-789", workspaceId };

      const mockCandidate: SampleCandidate = {
        id: candidateId,
        workspaceId,
        fullName: "Error Candidate",
        email: "error@example.com",
        createdAt: new Date(),
        workspace: {} as any,
      };

      candidatesRepository.findOne.mockResolvedValue(mockCandidate);
      
      const repositoryError = new Error("Database connection failed");
      summariesRepository.find.mockRejectedValue(repositoryError);

      // Act & Assert
      await expect(
        service.getSummariesForCandidate(candidateId, authUser)
      ).rejects.toThrow("Database connection failed");

      expect(candidatesRepository.findOne).toHaveBeenCalledWith({
        where: { id: candidateId, workspaceId },
      });
      expect(summariesRepository.find).toHaveBeenCalledWith({
        where: { candidateId },
        order: { createdAt: "DESC" },
      });
    });
  });
});