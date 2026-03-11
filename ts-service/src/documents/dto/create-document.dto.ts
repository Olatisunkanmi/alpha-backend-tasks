import { Transform } from "class-transformer";
import {
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
} from "class-validator";
import { DocumentType, FileType } from "src/common/enums";

export class CreateDocumentDto {
  @IsEnum(DocumentType)
  @Transform(({ value }) => value as DocumentType)
  documentType!: DocumentType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName!: string;

  @IsUUID()
  candidateId!: string;

  @IsNotEmpty()
  @IsString()
  rawText!: string;

  @IsNotEmpty()
  @IsString()
  storageKey!: string;
}
