import { readFile } from 'node:fs/promises';
import { PDFParse } from 'pdf-parse';
import { ResumeError } from '../../core/errors.js';
import type { PdfTextExtractor } from '../../core/init-resume/ports.js';

export class PdfParseTextExtractor implements PdfTextExtractor {
  async extract(path: string): Promise<string> {
    let parser: PDFParse | undefined;
    try {
      parser = new PDFParse({ data: await readFile(path) });
      return (await parser.getText()).text;
    } catch (error) {
      throw new ResumeError(
        'input-read',
        `Unable to extract text from LinkedIn PDF ${path}: ${String(error)}`,
        { cause: error },
      );
    } finally {
      await parser?.destroy();
    }
  }
}
