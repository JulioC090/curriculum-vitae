import { expect, test } from 'vitest';
import {
  BuiltInLatexGenerator,
  escapeLatex,
} from '../src/generator/latex/latex-generator.js';

test('escapes LaTeX control characters', () => {
  expect(escapeLatex('50% & C_{}')).toBe('50\\% \\& C\\_\\{\\}');
});

test('generates a document and omits empty sections', () => {
  const latex = new BuiltInLatexGenerator().generate({
    personal: { name: 'Jane & Doe', email: 'jane@example.com' },
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
  });
  expect(latex).toContain('Jane \\& Doe');
  expect(latex).not.toContain('Experience');
  expect(latex).toContain('\\end{document}');
});

test('does not add a line break after project bullets', () => {
  const latex = new BuiltInLatexGenerator().generate({
    personal: { name: 'Jane Doe', email: 'jane@example.com' },
    experience: [],
    education: [],
    skills: [],
    projects: [
      {
        name: 'Resume Builder',
        description: ['Generated PDF resumes'],
        url: undefined,
        technologies: ['TypeScript'],
      },
    ],
    certifications: [],
  });
  expect(latex).toContain('\\end{itemize}\n\\emph{Technologies:}');
  expect(latex).not.toContain('\\end{itemize}\\\\');
});
