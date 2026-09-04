import { access, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { describe, expect, test } from 'vitest';
import { PdfLatexRenderer } from '../src/render/pdf/pdf-latex-renderer.js';
import { BuiltInLatexGenerator } from '../src/generator/latex/latex-generator.js';

const hasPdflatex = (() => {
  try {
    execFileSync('pdflatex', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();

describe.skipIf(!hasPdflatex)('PDF integration', () => {
  test('renders a LaTeX fixture into a PDF and retains source', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'curriculum-vitae-test-'));
    const latexPath = join(directory, 'resume.tex');
    const pdfPath = join(directory, 'resume.pdf');
    const latex = new BuiltInLatexGenerator().generate({
      personal: { name: 'Test Resume', email: 'test@example.com' },
      experience: [],
      education: [],
      skills: [],
      projects: [],
      certifications: [],
    });
    await writeFile(latexPath, latex);
    try {
      await new PdfLatexRenderer().render(latexPath, pdfPath);
      await access(pdfPath);
      await access(latexPath);
      expect(true).toBe(true);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
