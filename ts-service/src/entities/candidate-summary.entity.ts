import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { SummaryStatus } from "../common/enums";
import { SampleCandidate } from "./sample-candidate.entity";

@Entity("candidate_summaries")
export class CandidateSummary {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column("varchar", { length: 64, name: "candidate_id" })
  candidateId!: string;

  @Column({
    type: "enum",
    enum: SummaryStatus,
    default: SummaryStatus.PENDING,
  })
  status!: SummaryStatus;

  @Column("integer", { nullable: true })
  score!: number | null;

  @Column("text", { nullable: true })
  strengths!: string | null;

  @Column("text", { nullable: true })
  concerns!: string | null;

  @Column("text", { nullable: true })
  summary!: string | null;

  @Column("varchar", {
    length: 50,
    nullable: true,
    name: "recommended_decision",
  })
  recommendedDecision!: string | null;

  @Column("varchar", { length: 50, nullable: true })
  provider!: string | null;

  @Column("varchar", { length: 20, nullable: true, name: "prompt_version" })
  promptVersion!: string | null;

  @Column("text", { nullable: true, name: "error_message" })
  errorMessage!: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  @ManyToOne(() => SampleCandidate, { onDelete: "CASCADE" })
  @JoinColumn({ name: "candidate_id" })
  candidate!: SampleCandidate;
}
