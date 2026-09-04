import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { ResumeError } from '../../core/errors.js';
import type { DocumentWriter } from '../../core/generate-resume/ports/index.js';

export class FileSystemDocumentWriter implements DocumentWriter {
  async write(
    path: string,
    contents: string,
    options: { overwrite?: boolean } = {},
  ): Promise<void> {
    try {
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, contents, {
        encoding: 'utf8',
        flag: options.overwrite ? 'w' : 'wx',
      });
    } catch (error) {
      throw new ResumeError(
        'output-write',
        `Unable to write LaTeX output: ${path}`,
        { cause: error },
      );
    }
  }
}
