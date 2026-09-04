import { mapInputToDomain } from '../../resume/input/map-input.js';
import type {
  DocumentWriter,
  LatexGenerator,
  PdfRenderer,
  ResumeDataReader,
} from './ports/index.js';

export interface GenerateResumeDependencies {
  dataReader: ResumeDataReader;
  latexGenerator: LatexGenerator;
  documentWriter: DocumentWriter;
  pdfRenderer: PdfRenderer;
}

export interface GenerateResumeOptions {
  latexPath: string;
  pdfPath: string;
  keepLog?: boolean;
  overwrite?: boolean;
}

export async function generateResume(
  dependencies: GenerateResumeDependencies,
  options: GenerateResumeOptions,
): Promise<{ latexPath: string; pdfPath: string }> {
  const input = await dependencies.dataReader.read();
  const resume = mapInputToDomain(input);
  const latex = await dependencies.latexGenerator.generate(resume);
  await dependencies.documentWriter.write(options.latexPath, latex, {
    overwrite: options.overwrite,
  });
  await dependencies.pdfRenderer.render(options.latexPath, options.pdfPath, {
    keepLog: options.keepLog,
    overwrite: options.overwrite,
  });
  return { latexPath: options.latexPath, pdfPath: options.pdfPath };
}
