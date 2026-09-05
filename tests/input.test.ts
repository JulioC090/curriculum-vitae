import { mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { FileSystemResumeDataReader } from '../src/resume/input/file-system-cv-data-reader.js';
import { mapInputToDomain } from '../src/resume/input/map-input.js';

const valid = {
  schemaVersion: 1,
  personal: { name: 'Jane Doe', email: 'jane@example.com' },
  experience: [],
  education: [],
  skills: [],
  projects: [],
  certifications: [],
};

describe('resume input', () => {
  test('maps version one directory data and defaults sections', () => {
    expect(mapInputToDomain(valid)).toEqual({
      personal: valid.personal,
      experience: [],
      education: [],
      skills: [],
      projects: [],
      certifications: [],
    });
  });

  test('maps periods and achievements into the domain model', () => {
    const result = mapInputToDomain({
      ...valid,
      experience: [
        {
          id: 'exp-company',
          company: 'Company',
          role: 'Engineer',
          period: { start: '2021-01', end: 'present' },
          achievements: [{ id: 'api-speed', claim: 'Reduced latency.' }],
          technologies: ['TypeScript'],
        },
      ],
    });
    expect(result.experience[0]?.period.start).toEqual({
      year: 2021,
      month: 1,
    });
    expect(result.experience[0]?.period.end).toBe('present');
  });

  test('rejects invalid fields and IDs', () => {
    expect(() => mapInputToDomain({ ...valid, schemaVersion: 2 })).toThrow(
      'invalid',
    );
    expect(() =>
      mapInputToDomain({
        ...valid,
        personal: { ...valid.personal, email: 'bad' },
      }),
    ).toThrow('invalid');
    expect(() =>
      mapInputToDomain({
        ...valid,
        projects: [
          { id: 'Not valid', name: 'Project', description: 'A project' },
        ],
      }),
    ).toThrow('invalid');
  });

  test('reads independent YAML files and sorts them by period', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'curriculum-vitae-'));
    await mkdir(join(directory, 'experience'));
    await mkdir(join(directory, 'projects'));
    await writeFile(
      join(directory, 'profile.yaml'),
      'schemaVersion: 1\nname: Jane Doe\nemail: jane@example.com\n',
    );
    await writeFile(
      join(directory, 'experience', 'exp-old.yaml'),
      [
        'id: exp-old',
        'company: Old Co',
        'role: Engineer',
        'period:',
        '  start: "2020-01"',
        'achievements:',
        '  - id: old-work',
        '    claim: Did old work.',
        '',
      ].join('\n'),
    );
    await writeFile(
      join(directory, 'experience', 'exp-new.yaml'),
      [
        'id: exp-new',
        'company: New Co',
        'role: Engineer',
        'period:',
        '  start: "2022-01"',
        'achievements:',
        '  - id: new-work',
        '    claim: Did new work.',
        '',
      ].join('\n'),
    );
    await writeFile(
      join(directory, 'projects', 'project-z.yaml'),
      'id: project-z\nname: Z\ndescription: Z project\n',
    );
    await writeFile(
      join(directory, 'projects', 'project-a.yaml'),
      'id: project-a\nname: A\ndescription: A project\n',
    );
    try {
      const input = (await new FileSystemResumeDataReader(
        directory,
      ).read()) as { experience: Array<{ id: string }> };
      expect(input.experience.map((item) => item.id)).toEqual([
        'exp-new',
        'exp-old',
      ]);
      expect(
        (input as unknown as { projects: Array<{ id: string }> }).projects.map(
          (item) => item.id,
        ),
      ).toEqual(['project-a', 'project-z']);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test('rejects custom YAML tags with a source path', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'curriculum-vitae-'));
    await writeFile(
      join(directory, 'profile.yaml'),
      'schemaVersion: 1\nname: !Person Jane Doe\nemail: jane@example.com\n',
    );
    await expect(
      new FileSystemResumeDataReader(directory).read(),
    ).rejects.toThrow(`${directory}/profile.yaml`);
    await rm(directory, { recursive: true, force: true });
  });
});
