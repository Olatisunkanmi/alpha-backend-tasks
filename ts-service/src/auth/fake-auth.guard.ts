import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { Request } from "express";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { AuthUser } from "./auth.types";
import { Recruiter, SampleCandidate, SampleWorkspace } from "../entities";
import { isString, isUUID } from "class-validator";

@Injectable()
export class FakeAuthGuard implements CanActivate {
  constructor(
    @InjectRepository(Recruiter)
    private readonly recruiterRepository: Repository<Recruiter>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const userIdHeader = request.header("x-user-id");
    const workspaceIdHeader = request.header("x-workspace-id");

    if (!userIdHeader || !workspaceIdHeader) {
      throw new UnauthorizedException(
        "Missing required headers: x-user-id and x-workspace-id",
      );
    }

    if (!isUUID(userIdHeader)) {
      throw new UnauthorizedException("Invalid X-User-Id Header");
    }

    if (!isString(workspaceIdHeader)) {
      throw new UnauthorizedException("Invalid X-Workspace-Id Header");
    }

    const isValidUser = await this.recruiterRepository.findOne({
      where: { id: userIdHeader, workspaceId: workspaceIdHeader },
    });

    if (!isValidUser) {
      throw new UnauthorizedException("Invalid Credentials Provided");
    }

    const user: AuthUser = {
      userId: userIdHeader,
      workspaceId: workspaceIdHeader,
    };

    request.user = user;
    return true;
  }
}

@Injectable()
export class FakeCandidateGuard implements CanActivate {
  constructor(
    @InjectRepository(Recruiter)
    private readonly recruiterRepository: Repository<Recruiter>,
    @InjectRepository(SampleCandidate)
    private readonly sampleCandidateRepository: Repository<SampleCandidate>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const candidateId = request.params.candidateId;

    if (!candidateId) {
      return true;
    }
    const workspaceIdHeader = request.header("x-workspace-id");

    if (!isString(candidateId) || !isString(workspaceIdHeader)) {
      throw new UnauthorizedException("Invalid Candidate ID or Workspace ID");
    }

    const isValidCandidate = await this.sampleCandidateRepository.findOne({
      where: { id: candidateId, workspaceId: workspaceIdHeader },
    });

    if (!isValidCandidate) {
      throw new UnauthorizedException(
        "Auth: Invalid Candidate ID or Workspace ID",
      );
    }

    return true;
  }
}
