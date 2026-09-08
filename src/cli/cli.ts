import { existsSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import 'dotenv/config';
import { Command, CommanderError } from 'commander';
import { generateResume } from '../core/generate-resume/generate-resume.js';
import { ResumeError } from '../core/errors.js';
import { FileSystemResumeDataReader } from '../resume/input/file-system-cv-data-reader.js';
import { BuiltInLatexGenerator } from '../generator/latex/latex-generator.js';
import { FileSystemDocumentWriter } from '../generator/latex/file-system-document-writer.js';
import { PdfLatexRenderer } from '../render/pdf/pdf-latex-renderer.js';
import { initResume } from '../core/init-resume/init-resume.js';
import { PdfParseTextExtractor } from '../resume/input/pdf-text-extractor.js';
import { OpenRouterResumeModel } from '../llm/openrouter-resume-model.js';
import { writeResumeData } from '../resume/input/resume-data-writer.js';

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
    .command('init')
    .description('Initialize resume data from a LinkedIn profile PDF')
    .requiredOption('--linkedin <path>', 'LinkedIn profile PDF path')
    .option('--output <path>', 'Resume data directory', './data')
    .option('--force', 'Replace existing resume data')
    .option(
      '--allow-large-input',
      'Continue when extracted PDF text exceeds the safety limit',
    )
    .action(
      async (options: {
        linkedin: string;
        output: string;
        force?: boolean;
        allowLargeInput?: boolean;
      }) => {
        if (extname(options.linkedin).toLowerCase() !== '.pdf') {
          stderr('Init requires a .pdf --linkedin path.');
          exitCode = exitCodes.invalidInput;
          return;
        }
        if (!existsSync(resolve(options.linkedin))) {
          stderr(`LinkedIn PDF does not exist: ${options.linkedin}`);
          exitCode = exitCodes.inputRead;
          return;
        }
        try {
          const result = await initResume(
            {
              pdfTextExtractor: new PdfParseTextExtractor(),
              model: new OpenRouterResumeModel(),
            },
            {
              linkedinPath: resolve(options.linkedin),
              allowLargeInput: options.allowLargeInput ?? false,
              onLargeInput: (length, limit) =>
                stderr(
                  `Warning: extracted PDF text is ${length} characters, above the ${limit} character limit.${options.allowLargeInput ? ' Continuing because --allow-large-input was provided.' : ' Re-run with --allow-large-input to continue.'}`,
                ),
            },
          );
          const outputPath = resolve(options.output);
          await writeResumeData(outputPath, result, options.force ?? false, {
            sources: {
              linkedin: {
                imported_at: new Date().toISOString().slice(0, 10),
                version: 1,
              },
            },
          });
          stdout(
            `Resume data: ${outputPath}\nExperience: ${result.experience.length}\nEducation: ${result.education.length}\nProjects: ${result.projects.length}\nCertifications: ${result.certifications.length}\nSkill groups: ${result.skills.length}`,
          );
        } catch (error) {
          const failure =
            error instanceof ResumeError
              ? error
              : new ResumeError('output-write', String(error));
          stderr(failure.message);
          exitCode = {
            'invalid-input': exitCodes.invalidInput,
            'input-read': exitCodes.inputRead,
            'latex-generation': exitCodes.latexGeneration,
            'pdf-rendering': exitCodes.pdfRendering,
            'output-write': exitCodes.outputWrite,
          }[failure.category];
        }
      },
    );

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
