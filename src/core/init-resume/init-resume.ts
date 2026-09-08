import { ResumeError } from '../errors.js';
import type { PdfTextExtractor, StructuredResumeModel } from './ports.js';
import { resumeExtractionSchema, type ResumeExtraction } from './schemas.js';
import type { ResumeInput } from '../../resume/input/schema.js';

export const maxExtractedTextLength = 200_000;

export interface InitResumeDependencies {
  pdfTextExtractor: PdfTextExtractor;
  model: StructuredResumeModel;
}

export interface InitResumeOptions {
  linkedinPath: string;
  allowLargeInput?: boolean;
  onLargeInput?: (length: number, limit: number) => void;
}

export async function initResume(
  dependencies: InitResumeDependencies,
  options: InitResumeOptions,
): Promise<ResumeInput> {
  const sourceText = await dependencies.pdfTextExtractor.extract(
    options.linkedinPath,
  );
  const text = sourceText.trim();
  if (!text) {
    throw new ResumeError(
      'invalid-input',
      'The LinkedIn PDF does not contain extractable text.',
    );
  }
  if (text.length > maxExtractedTextLength) {
    options.onLargeInput?.(text.length, maxExtractedTextLength);
    if (!options.allowLargeInput) {
      throw new ResumeError(
        'invalid-input',
        `Extracted PDF text is ${text.length} characters, exceeding the ${maxExtractedTextLength} character limit. Re-run with --allow-large-input to continue.`,
      );
    }
  }

  let response: unknown;
  try {
    response = await dependencies.model.infer(text);
  } catch (error) {
    throw new ResumeError(
      'input-read',
      `The LLM request failed: ${formatError(error)}`,
      { cause: error },
    );
  }
  let extraction: ResumeExtraction;
  try {
    extraction = resumeExtractionSchema.parse(response);
  } catch (error) {
    throw new ResumeError(
      'invalid-input',
      `The LLM returned data that does not match the resume schema: ${formatError(error)}`,
      { cause: error },
    );
  }
  return addGeneratedIds(extraction);
}

function formatError(error: unknown): string {
  console.error('Error details:', error);
  if (!(error instanceof Error)) return String(error);
  const details =
    'response_metadata' in error
      ? (error as Error & { response_metadata?: unknown }).response_metadata
      : undefined;
  return details
    ? `${error.message} (${JSON.stringify(details)})`
    : error.message;
}

function addGeneratedIds(extraction: ResumeExtraction): ResumeInput {
  const usedIds = new Set<string>();
  const makeId = (value: string): string => {
    const base = slug(value);
    let candidate = base;
    let suffix = 2;
    while (usedIds.has(candidate)) candidate = `${base}-${suffix++}`;
    usedIds.add(candidate);
    return candidate;
  };
  const achievements = (itemId: string, claims: Array<{ claim: string }>) =>
    claims.map(({ claim }) => ({ id: makeId(`${itemId}-${claim}`), claim }));

  const experience = extraction.experience.map((item) => {
    const id = makeId(`${item.role}-${item.company}`);
    return { ...item, id, achievements: achievements(id, item.achievements) };
  });
  const education = extraction.education.map((item) => {
    const id = makeId(`${item.degree}-${item.institution}`);
    return { ...item, id, achievements: achievements(id, item.achievements) };
  });
  const projects = extraction.projects.map((item) => {
    const id = makeId(item.name);
    return { ...item, id, achievements: achievements(id, item.achievements) };
  });
  const certifications = extraction.certifications.map((item) => ({
    ...item,
    id: makeId(`${item.name}-${item.issuer}`),
  }));
  return {
    schemaVersion: 1,
    personal: extraction.personal,
    experience,
    education,
    skills: extraction.skills,
    projects,
    certifications,
  };
}

function slug(value: string): string {
  const result = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return result || 'item';
}
