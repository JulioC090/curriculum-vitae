import { existsSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { generateResume } from '../core/generate-resume/generate-resume.js';
import { ResumeError } from '../core/errors.js';
import { FileSystemResumeDataReader } from '../resume/input/file-system-cv-data-reader.js';
import { BuiltInLatexGenerator } from '../generator/latex/latex-generator.js';
import { FileSystemDocumentWriter } from '../generator/latex/file-system-document-writer.js';
import { PdfLatexRenderer } from '../render/pdf/pdf-latex-renderer.js';

export const exitCodes = {
  invalidInput: 2,
  inputRead: 3,
  latexGeneration: 4,
  pdfRendering: 5,
  outputWrite: 6,
} as const;
const help = `Usage: curriculum-vitae generate --input resume.json --output resume.pdf [--force] [--keep-log]\n\nOptions:\n  --help       Show this help\n  --version    Show the version\n  --force      Overwrite existing outputs\n  --keep-log   Retain the pdflatex compiler log`;

export async function runCli(
  args: string[],
  stdout = console.log,
  stderr = console.error,
): Promise<number> {
  if (args.includes('--help') || args.length === 0) {
    stdout(help);
    return 0;
  }
  if (args.includes('--version')) {
    stdout('0.1.0');
    return 0;
  }
  if (args[0] !== 'generate') {
    stderr('Unknown command. Use --help for usage.');
    return 1;
  }
  const input = option(args, '--input');
  const output = option(args, '--output');
  if (!input || !output || extname(output) !== '.pdf') {
    stderr('Generate requires --input and a .pdf --output path.');
    return exitCodes.invalidInput;
  }
  const pdfPath = resolve(output);
  const latexPath = pdfPath.slice(0, -4) + '.tex';
  if (
    !args.includes('--force') &&
    (existsSync(pdfPath) || existsSync(latexPath))
  ) {
    stderr('Output exists. Use --force to overwrite it.');
    return exitCodes.outputWrite;
  }
  try {
    const result = await generateResume(
      {
        dataReader: new FileSystemResumeDataReader(resolve(input)),
        latexGenerator: new BuiltInLatexGenerator(),
        documentWriter: new FileSystemDocumentWriter(),
        pdfRenderer: new PdfLatexRenderer(),
      },
      {
        latexPath,
        pdfPath,
        keepLog: args.includes('--keep-log'),
        overwrite: args.includes('--force'),
      },
    );
    stdout(`PDF: ${result.pdfPath}\nLaTeX: ${result.latexPath}`);
    return 0;
  } catch (error) {
    const failure =
      error instanceof ResumeError
        ? error
        : new ResumeError('output-write', String(error));
    stderr(failure.message);
    return {
      'invalid-input': 2,
      'input-read': 3,
      'latex-generation': 4,
      'pdf-rendering': 5,
      'output-write': 6,
    }[failure.category];
  }
}
function option(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}
