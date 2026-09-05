import { existsSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { Command, CommanderError } from 'commander';
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

const packageJson = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
) as { version: string };

export async function runCli(
  args: string[],
  stdout = console.log,
  stderr = console.error,
): Promise<number> {
  let exitCode = 0;
  const program = new Command()
    .name('curriculum-vitae')
    .description('CLI for managing a curriculum vitae')
    .version(packageJson.version, '--version', 'Show the version')
    .helpOption('--help', 'Show help')
    .exitOverride()
    .configureOutput({
      writeOut: (message) => stdout(message.trimEnd()),
      writeErr: (message) => stderr(message.trimEnd()),
    });

  program
    .command('generate')
    .description('Generate a PDF from resume data')
    .option('--input <path>', 'Resume data directory', './data')
    .requiredOption('--output <path>', 'PDF output path')
    .option('--template <name|path>', 'Template name or .tex path')
    .option('--force', 'Overwrite existing outputs')
    .option('--keep-log', 'Retain the pdflatex compiler log')
    .action(
      async (options: {
        input: string;
        output: string;
        template?: string;
        force?: boolean;
        keepLog?: boolean;
      }) => {
        if (extname(options.output) !== '.pdf') {
          stderr('Generate requires a .pdf --output path.');
          exitCode = exitCodes.invalidInput;
          return;
        }

        const pdfPath = resolve(options.output);
        const latexPath = pdfPath.slice(0, -4) + '.tex';
        if (!options.force && (existsSync(pdfPath) || existsSync(latexPath))) {
          stderr('Output exists. Use --force to overwrite it.');
          exitCode = exitCodes.outputWrite;
          return;
        }

        try {
          const result = await generateResume(
            {
              dataReader: new FileSystemResumeDataReader(
                resolve(options.input),
              ),
              latexGenerator: new BuiltInLatexGenerator(options.template),
              documentWriter: new FileSystemDocumentWriter(),
              pdfRenderer: new PdfLatexRenderer(),
            },
            {
              latexPath,
              pdfPath,
              keepLog: options.keepLog ?? false,
              overwrite: options.force ?? false,
            },
          );
          stdout(`PDF: ${result.pdfPath}\nLaTeX: ${result.latexPath}`);
        } catch (error) {
          const failure =
            error instanceof ResumeError
              ? error
              : new ResumeError('output-write', String(error));
          stderr(failure.message);
          exitCode = {
            'invalid-input': 2,
            'input-read': 3,
            'latex-generation': 4,
            'pdf-rendering': 5,
            'output-write': 6,
          }[failure.category];
        }
      },
    );

  if (args.length === 0) {
    stdout(program.helpInformation().trimEnd());
    return 0;
  }

  try {
    await program.parseAsync(args, { from: 'user' });
    return exitCode;
  } catch (error) {
    if (
      error instanceof CommanderError &&
      (error.code === 'commander.helpDisplayed' ||
        error.code === 'commander.version')
    ) {
      return 0;
    }
    return error instanceof CommanderError ? error.exitCode : 1;
  }
}
