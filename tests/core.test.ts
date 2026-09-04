import { expect, test, vi } from 'vitest';
import { generateResume } from '../src/core/generate-resume/generate-resume.js';

test('core workflow reads, maps, writes, renders, and returns paths', async () => {
  const calls: string[] = [];
  const result = await generateResume(
    {
      dataReader: {
        read: async () => ({
          schemaVersion: 1,
          personal: { name: 'Jane', email: 'jane@example.com' },
        }),
      },
      latexGenerator: { generate: vi.fn(() => '\\document') },
      documentWriter: {
        write: vi.fn(async (path) => {
          calls.push(`write:${path}`);
        }),
      },
      pdfRenderer: {
        render: vi.fn(async (tex, pdf) => {
          calls.push(`render:${tex}:${pdf}`);
        }),
      },
    },
    { latexPath: 'resume.tex', pdfPath: 'resume.pdf' },
  );
  expect(result).toEqual({ latexPath: 'resume.tex', pdfPath: 'resume.pdf' });
  expect(calls).toEqual(['write:resume.tex', 'render:resume.tex:resume.pdf']);
});
