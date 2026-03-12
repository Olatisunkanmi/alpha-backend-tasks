import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { DataSourceOptions } from "typeorm";

import { SampleCandidate } from "../entities/sample-candidate.entity";
import { SampleWorkspace } from "../entities/sample-workspace.entity";
import { Recruiter } from "../entities/recruiter.entity";
import { CandidateDocument } from "../entities/candidate-document.entity";
import { CandidateSummary } from "../entities/candidate-summary.entity";
import { InitialStarterEntities1710000000000 } from "../migrations/1710000000000-InitialStarterEntities";
import { CandidateDocumentsAndSummaries1710000001000 } from "../migrations/1710000001000-CandidateDocumentsAndSummaries";
import { AddRecruitersTable1710000002000 } from "../migrations/1710000002000-AddRecruitersTable";

export const defaultDatabaseUrl =
  "postgres://pgUser:pgPass1@localhost:5432/assessment_db?schema=public";

export const getTypeOrmOptions = (
  databaseUrl: string,
): TypeOrmModuleOptions & DataSourceOptions => ({
  type: "postgres",
  url: databaseUrl,
  entities: [
    SampleWorkspace,
    SampleCandidate,
    CandidateDocument,
    CandidateSummary,
    Recruiter,
  ],
  migrations: [
    InitialStarterEntities1710000000000,
    CandidateDocumentsAndSummaries1710000001000,
    AddRecruitersTable1710000002000,
  ],
  migrationsTableName: "typeorm_migrations",
  synchronize: false,
  logging: true,
});
