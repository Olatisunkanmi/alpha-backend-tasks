import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { FakeAuthGuard } from "./fake-auth.guard";
import { Recruiter, SampleWorkspace } from "../entities";

@Module({
  imports: [TypeOrmModule.forFeature([SampleWorkspace, Recruiter])],
  providers: [FakeAuthGuard],
  exports: [FakeAuthGuard],
})
export class AuthModule {}
