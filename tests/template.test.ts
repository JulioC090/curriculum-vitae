import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { BuiltInLatexGenerator } from '../src/generator/latex/latex-generator.js';
import { resolveTemplatePath } from '../src/generator/latex/template-resolver.js';

const resume = {
  personal: { name: 'Jane & Doe', email: 'jane@example.com' },
  experience: [],
  education: [],
  skills: [],
  projects: [],
  certifications: [],
};

test('resolves a named template from the templates folder', () => {
  expect(resolveTemplatePath('default')).toMatch(
    /templates[\\/]default[\\/]resume\.tex$/,
  );
});

test('renders a custom template and escapes resume data as LaTeX', () => {
  const directory = mkdtempSync(join(tmpdir(), 'curriculum-vitae-'));
  const path = join(directory, 'custom.tex');
  writeFileSync(
    path,
    '\\documentclass{article}\n{{personal.name}}\n\\begin{document}\n{{personal.email}}\n\\end{document}\n',
  );

  expect(new BuiltInLatexGenerator(path).generate(resume)).toContain(
    'Jane \\& Doe',
  );
});

test('rejects missing variables in a custom template', () => {
  const directory = mkdtempSync(join(tmpdir(), 'curriculum-vitae-'));
  mkdirSync(join(directory, 'nested'));
  const path = join(directory, 'nested', 'custom.tex');
  writeFileSync(
    path,
    '\\documentclass{article}\\begin{document}{{personal.missing}}\\end{document}',
  );

  expect(() => new BuiltInLatexGenerator(path).generate(resume)).toThrow(
    /missing/,
  );
});
