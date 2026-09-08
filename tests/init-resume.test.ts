import { mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import {
  initResume,
  maxExtractedTextLength,
} from '../src/core/init-resume/init-resume.js';
import { ResumeError } from '../src/core/errors.js';
import { writeResumeData } from '../src/resume/input/resume-data-writer.js';

const extraction = {
  personal: { name: 'Ada Lovelace', email: 'ada@example.com' },
  experience: [
    {
      role: 'Engineer',
      company: 'Analytical Engines',
      period: { start: '2020-01', end: 'present' },
      achievements: [{ claim: 'Built a reliable engine.' }],
      technologies: ['TypeScript'],
    },
  ],
  education: [],
  skills: [{ category: 'Languages', items: ['TypeScript'] }],
  projects: [],
  certifications: [],
};

test('initializes a validated resume with deterministic generated IDs', async () => {
  const result = await initResume(
    {
      pdfTextExtractor: { extract: async () => 'LinkedIn text' },
      model: { infer: async () => extraction },
    },
    { linkedinPath: 'profile.pdf' },
  );

  expect(result.schemaVersion).toBe(1);
  expect(result.experience[0]?.id).toBe('engineer-analytical-engines');
  expect(result.experience[0]?.achievements[0]?.id).toBe(
    'engineer-analytical-engines-built-a-reliable-engine',
  );
});

test('rejects empty and oversized extracted text before model inference', async () => {
  let calls = 0;
  await expect(
    initResume(
      {
        pdfTextExtractor: { extract: async () => '   ' },
        model: {
          infer: async () => {
            calls += 1;
            return extraction;
          },
        },
      },
      { linkedinPath: 'profile.pdf' },
    ),
  ).rejects.toThrow('does not contain extractable text');
  expect(calls).toBe(0);

  await expect(
    initResume(
      {
        pdfTextExtractor: {
          extract: async () => 'x'.repeat(maxExtractedTextLength + 1),
        },
        model: {
          infer: async () => {
            calls += 1;
            return extraction;
          },
        },
      },
      { linkedinPath: 'profile.pdf' },
    ),
  ).rejects.toThrow('--allow-large-input');
  expect(calls).toBe(0);
});

test('reports provider failures separately from schema failures', async () => {
  await expect(
    initResume(
      {
        pdfTextExtractor: { extract: async () => 'LinkedIn text' },
        model: {
          infer: async () => {
            throw new Error('400 Provider returned error');
          },
        },
      },
      { linkedinPath: 'profile.pdf' },
    ),
  ).rejects.toThrow('The LLM request failed: 400 Provider returned error');
});

test('writes split YAML data and preserves unrelated files when forced', async () => {
  const root = await mkdtemp(join(tmpdir(), 'curriculum-vitae-init-'));
  const output = join(root, 'data');
  await writeResumeData(
    output,
    {
      schemaVersion: 1,
      personal: extraction.personal,
      experience: [],
      education: [],
      skills: extraction.skills,
      projects: [],
      certifications: [],
    },
    false,
  );
  await writeFile(join(output, 'notes.txt'), 'keep me');
  await writeResumeData(
    output,
    {
      schemaVersion: 1,
      personal: extraction.personal,
      experience: extraction.experience.map((item) => ({
        ...item,
        id: 'engineer',
        achievements: [
          { id: 'achievement', claim: item.achievements[0]!.claim },
        ],
      })),
      education: [],
      skills: extraction.skills,
      projects: [],
      certifications: [],
    },
    true,
    {
      sources: {
        linkedin: { imported_at: '2026-09-05', version: 1 },
      },
    },
  );

  expect(await readFile(join(output, 'notes.txt'), 'utf8')).toBe('keep me');
  expect(await readFile(join(output, 'profile.yaml'), 'utf8')).toContain(
    'schemaVersion: 1',
  );
  const profile = await readFile(join(output, 'profile.yaml'), 'utf8');
  expect(profile.indexOf('sources:')).toBeGreaterThan(
    profile.indexOf('email:'),
  );
  expect(await readFile(join(output, 'skills.yaml'), 'utf8')).toContain(
    'skills:\n',
  );
  expect(await readFile(join(output, 'skills.yaml'), 'utf8')).toContain(
    'sources:\n',
  );
  const experience = await readFile(
    join(output, 'experience', 'engineer.yaml'),
    'utf8',
  );
  expect(experience.indexOf('sources:')).toBeGreaterThan(
    experience.indexOf('technologies:'),
  );
  expect(await readdir(join(output, 'experience'))).toEqual(['engineer.yaml']);
});

test('rejects existing generated data without force', async () => {
  const root = await mkdtemp(join(tmpdir(), 'curriculum-vitae-init-'));
  const output = join(root, 'data');
  await writeResumeData(
    output,
    {
      schemaVersion: 1,
      personal: extraction.personal,
      experience: [],
      education: [],
      skills: [],
      projects: [],
      certifications: [],
    },
    false,
  );
  await expect(
    writeResumeData(
      output,
      {
        schemaVersion: 1,
        personal: extraction.personal,
        experience: [],
        education: [],
        skills: [],
        projects: [],
        certifications: [],
      },
      false,
    ),
  ).rejects.toBeInstanceOf(ResumeError);
});
