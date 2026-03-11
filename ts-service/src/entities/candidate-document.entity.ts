import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from "typeorm";
import { DocumentType } from "../common/enums";
import { SampleCandidate } from "./sample-candidate.entity";

@Entity("candidate_documents")
export class CandidateDocument {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column("varchar", { length: 64, name: "candidate_id" })
  candidateId!: string;

  @Column({
    type: "enum",
    enum: DocumentType,
    name: "document_type",
  })
  documentType!: DocumentType;

  @Column("varchar", { length: 255, name: "file_name" })
  fileName!: string;

  @Column("varchar", { length: 512, name: "storage_key" })
  storageKey!: string;

  @Column("text", { name: "raw_text" })
  rawText!: string;

  @CreateDateColumn({ name: "uploaded_at" })
  uploadedAt!: Date;

  @ManyToOne(() => SampleCandidate, { onDelete: "CASCADE" })
  @JoinColumn({ name: "candidate_id" })
  candidate!: SampleCandidate;
}
