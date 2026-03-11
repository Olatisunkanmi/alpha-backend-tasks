import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from "typeorm";
import { SampleWorkspace } from "./sample-workspace.entity";

@Entity("recruiters")
export class Recruiter {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column("varchar", { length: 64, name: "workspace_id" })
  workspaceId!: string;

  @Column("varchar", { length: 160 })
  name!: string;

  @Column("varchar", { length: 160 })
  email!: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @ManyToOne(() => SampleWorkspace, { onDelete: "CASCADE" })
  @JoinColumn({ name: "workspace_id" })
  workspace!: SampleWorkspace;
}
