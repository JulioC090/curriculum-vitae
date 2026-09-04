import type { Resume } from '../../../resume/domain/resume.js';

export interface ResumeDataReader {
  read(): Promise<unknown>;
}
export interface LatexGenerator {
  generate(resume: Resume): Promise<string> | string;
}
export interface DocumentWriter {
  write(
    path: string,
    contents: string,
    options?: { overwrite?: boolean },
  ): Promise<void>;
}
export interface PdfRenderer {
  render(
    latexPath: string,
    pdfPath: string,
    options?: { keepLog?: boolean; overwrite?: boolean },
  ): Promise<void>;
}
