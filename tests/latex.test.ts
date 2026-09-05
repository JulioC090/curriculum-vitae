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

test('renders project descriptions and technologies', () => {
  const latex = new BuiltInLatexGenerator().generate({
    personal: { name: 'Jane Doe', email: 'jane@example.com' },
    experience: [],
    education: [],
    skills: [],
    projects: [
      {
        id: 'project-resume-builder',
        name: 'Resume Builder',
        description: 'Generated PDF resumes',
        achievements: [],
        period: undefined,
        order: undefined,
        url: undefined,
        technologies: ['TypeScript'],
      },
    ],
    certifications: [],
  });
  expect(latex).toContain('Generated PDF resumes\\\\');
  expect(latex).toContain('\\emph{Technologies:} TypeScript');
});
