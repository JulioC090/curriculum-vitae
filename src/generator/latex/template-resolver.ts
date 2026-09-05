import { existsSync, readFileSync } from 'node:fs';
import { dirname, extname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ResumeError } from '../../core/errors.js';

const sourceDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../',
);
const packagedDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../templates',
);

export function resolveTemplatePath(template?: string): string {
  if (!template) return findTemplate(packagedDirectory, 'default');

  const isPath =
    isAbsolute(template) ||
    template.includes('/') ||
    template.includes('\\') ||
    extname(template) !== '';
  const candidate = isPath
    ? isAbsolute(template)
      ? template
      : resolve(process.cwd(), template)
    : findTemplate(packagedDirectory, template);

  if (!existsSync(candidate)) {
    throw new ResumeError(
      'latex-generation',
      `Template not found: ${candidate}`,
    );
  }
  if (extname(candidate) !== '.tex') {
    throw new ResumeError(
      'latex-generation',
      `Template must be a .tex file: ${candidate}`,
    );
  }
  return candidate;
}

function findTemplate(directory: string, name: string): string {
  const candidates = [
    join(directory, name, 'resume.tex'),
    join(directory, `${name}.tex`),
    join(sourceDirectory, 'templates', name, 'resume.tex'),
    join(sourceDirectory, 'templates', `${name}.tex`),
  ];
  const candidate = candidates.find((path) => existsSync(path));
  if (!candidate) {
    throw new ResumeError('latex-generation', `Template not found: ${name}`);
  }
  return candidate;
}

export function readTemplate(template?: string): string {
  const path = resolveTemplatePath(template);
  try {
    return readFileSync(path, 'utf8');
  } catch (error) {
    throw new ResumeError(
      'latex-generation',
      `Unable to read template: ${path}`,
      {
        cause: error,
      },
    );
  }
}
