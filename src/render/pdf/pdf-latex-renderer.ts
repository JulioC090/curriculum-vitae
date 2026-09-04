import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
  copyFile,
  unlink,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, parse } from 'node:path';
import { spawn } from 'node:child_process';
import { ResumeError } from '../../core/errors.js';
import type { PdfRenderer } from '../../core/generate-resume/ports/index.js';

export class PdfLatexRenderer implements PdfRenderer {
  async render(
    latexPath: string,
    pdfPath: string,
    options: { keepLog?: boolean; overwrite?: boolean } = {},
  ): Promise<void> {
    const directory = await mkdtemp(join(tmpdir(), 'curriculum-vitae-'));
    const sourceName = basename(latexPath);
    try {
      await copyFile(latexPath, join(directory, sourceName));
      let result: { stderr: string };
      try {
        result = await this.run(directory, sourceName);
      } catch (error) {
        await mkdir(dirname(pdfPath), { recursive: true });
        const log = await readFile(
          join(directory, `${parse(sourceName).name}.log`),
          'utf8',
        ).catch(() => '');
        if (log) {
          await writeFile(
            join(dirname(pdfPath), `${parse(pdfPath).name}.log`),
            log,
          );
        }
        throw error;
      }
      await mkdir(dirname(pdfPath), { recursive: true });
      try {
        await copyFile(
          join(directory, `${parse(sourceName).name}.pdf`),
          pdfPath,
          options.overwrite ? 0 : 1,
        );
      } catch (error) {
        throw new ResumeError(
          'output-write',
          `Unable to write PDF output: ${pdfPath}`,
          { cause: error },
        );
      }
      if (options.keepLog) {
        const log = await readFile(
          join(directory, `${parse(sourceName).name}.log`),
          'utf8',
        ).catch(() => result.stderr);
        await writeFile(
          join(dirname(pdfPath), `${parse(pdfPath).name}.log`),
          log,
        );
      } else {
        await unlink(
          join(dirname(pdfPath), `${parse(pdfPath).name}.log`),
        ).catch(() => undefined);
      }
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
  private run(cwd: string, sourceName: string): Promise<{ stderr: string }> {
    return new Promise((resolve, reject) => {
      const child = spawn(
        'pdflatex',
        ['-interaction=nonstopmode', '-halt-on-error', sourceName],
        { cwd, shell: false },
      );
      let stderr = '';
      child.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });
      child.on('error', (error: NodeJS.ErrnoException) =>
        reject(
          new ResumeError(
            'pdf-rendering',
            error.code === 'ENOENT'
              ? 'pdflatex executable was not found'
              : error.message,
            { cause: error },
          ),
        ),
      );
      child.on('close', (code) =>
        code === 0
          ? resolve({ stderr })
          : reject(
              new ResumeError(
                'pdf-rendering',
                `pdflatex failed with exit code ${code}: ${stderr}`,
              ),
            ),
      );
    });
  }
}
