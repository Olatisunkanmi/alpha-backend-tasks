export interface ICreateDocument {
  candidateId: string;
  documentType: DocumentType;
  size: number;
  fileName: string;
  rawText: string;
  type: "pdf" | "doc" | "docx";
}
