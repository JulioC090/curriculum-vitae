import {
  cp,
  mkdir,
  mkdtemp,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { stringify } from 'yaml';
import { ResumeError } from '../../core/errors.js';
import type { ResumeInput, Sources } from './schema.js';

const generatedEntries = [
  'profile.yaml',
  'skills.yaml',
  'experience',
  'education',
  'projects',
  'certifications',
];

export async function writeResumeData(
  outputPath: string,
  input: ResumeInput,
  force: boolean,
  options: { sources?: Sources } = {},
): Promise<void> {
  const outputExists = await exists(outputPath);
  if (outputExists && !force && (await hasGeneratedData(outputPath))) {
    throw new ResumeError(
      'output-write',
      `Resume data already exists at ${outputPath}. Use --force to replace it.`,
    );
  }
  const parent = dirname(outputPath);
  await mkdir(parent, { recursive: true });
  const stage = await mkdtemp(join(parent, `.${basename(outputPath)}-`));
  const backup = `${outputPath}.backup-${process.pid}-${Date.now()}`;
  try {
    if (outputExists) await cp(outputPath, stage, { recursive: true });
    for (const entry of generatedEntries)
      await rm(join(stage, entry), { recursive: true, force: true });
    await writeFiles(stage, input, options.sources);
    if (outputExists) await rename(outputPath, backup);
    await rename(stage, outputPath);
    if (outputExists) await rm(backup, { recursive: true, force: true });
  } catch (error) {
    await rm(stage, { recursive: true, force: true });
    if (outputExists && (await exists(backup)) && !(await exists(outputPath)))
      await rename(backup, outputPath);
    if (error instanceof ResumeError) throw error;
    throw new ResumeError(
      'output-write',
      `Unable to write resume data to ${outputPath}: ${String(error)}`,
      { cause: error },
    );
  }
}

async function writeFiles(
  directory: string,
  input: ResumeInput,
  sources?: Sources,
): Promise<void> {
  await mkdir(directory, { recursive: true });
  await writeYaml(
    join(directory, 'profile.yaml'),
    withSources(
      {
        schemaVersion: 1,
        ...input.personal,
      },
      sources,
    ),
  );
  const skills = Object.fromEntries(
    input.skills.map((group) => [group.category, group.items]),
  );
  await writeYaml(
    join(directory, 'skills.yaml'),
    sources ? { skills, sources } : skills,
  );
  for (const section of [
    'experience',
    'education',
    'projects',
    'certifications',
  ] as const) {
    const items = input[section];
    if (items.length === 0) continue;
    const sectionDirectory = join(directory, section);
    await mkdir(sectionDirectory, { recursive: true });
    await Promise.all(
      items.map((item) =>
        writeYaml(
          join(sectionDirectory, `${item.id}.yaml`),
          withSources(item, sources),
        ),
      ),
    );
  }
}

function withSources<T extends object>(
  value: T,
  sources?: Sources,
): T | (T & { sources: Sources }) {
  return sources ? { ...value, sources } : value;
}

async function writeYaml(path: string, value: unknown): Promise<void> {
  await writeFile(path, stringify(value), 'utf8');
}

async function hasGeneratedData(path: string): Promise<boolean> {
  for (const entry of generatedEntries)
    if (await exists(join(path, entry))) return true;
  return false;
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}
