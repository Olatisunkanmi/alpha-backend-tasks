import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { Transform } from "class-transformer";
import { DocumentType } from "../../common/enums";

export class UploadDocumentDto {
  @IsEnum(DocumentType)
  @Transform(({ value }) => value as DocumentType)
  documentType!: DocumentType;

  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @IsString()
  @IsNotEmpty()
  rawText!: string;
}
