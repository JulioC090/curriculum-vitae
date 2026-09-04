import { readFile } from 'node:fs/promises';
import { ResumeError } from '../../core/errors.js';
import type { ResumeDataReader } from '../../core/generate-resume/ports/index.js';

export class FileSystemResumeDataReader implements ResumeDataReader {
  private static readonly maxInputBytes = 2 * 1024 * 1024;

  constructor(private readonly inputPath: string) {}
  async read(): Promise<unknown> {
    try {
      const contents = await readFile(this.inputPath);
      if (contents.byteLength > FileSystemResumeDataReader.maxInputBytes) {
        throw new ResumeError(
          'input-read',
          'Input file exceeds the 2 MiB size limit',
        );
      }
      return JSON.parse(contents.toString('utf8')) as unknown;
    } catch (error) {
      throw new ResumeError(
        'input-read',
        `Unable to read input file: ${this.inputPath}`,
        { cause: error },
      );
    }
  }
}
