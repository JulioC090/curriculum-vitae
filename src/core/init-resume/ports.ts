export interface PdfTextExtractor {
  extract(path: string): Promise<string>;
}

export interface StructuredResumeModel {
  infer(sourceText: string): Promise<unknown>;
}
