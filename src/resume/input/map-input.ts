import type { Resume } from '../domain/resume.js';
import { resumeInputSchema, type ResumeInput } from './schema.js';
import { ResumeError } from '../../core/errors.js';

function date(value: string): { year: number; month: number } {
  const [year, month] = value.split('-').map(Number);
  return { year, month };
}

function period(value: { start: string; end?: string }) {
  return {
    start: date(value.start),
    end:
      value.end === 'present'
        ? ('present' as const)
        : value.end
          ? date(value.end)
          : undefined,
  };
}

export function mapInputToDomain(input: unknown): Resume {
  const result = resumeInputSchema.safeParse(input);
  if (!result.success) {
    throw new ResumeError('invalid-input', result.error.message, {
      cause: result.error,
    });
  }
  return toDomain(result.data);
}

function toDomain(input: ResumeInput): Resume {
  return {
    personal: input.personal,
    experience: input.experience.map((item) => ({
      ...item,
      period: period(item.period),
    })),
    education: input.education.map((item) => ({
      ...item,
      period: period(item.period),
    })),
    skills: input.skills,
    projects: input.projects.map((item) => ({
      ...item,
      period: item.period ? period(item.period) : undefined,
    })),
    certifications: input.certifications.map((item) => ({
      ...item,
      issued: date(item.issued),
      expires: item.expires ? date(item.expires) : undefined,
    })),
  };
}
