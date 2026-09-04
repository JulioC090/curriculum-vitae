import type { Resume } from '../domain/resume.js';
import { resumeInputSchema, type ResumeInput } from './schema.js';
import { ResumeError } from '../../core/errors.js';

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
    experience: input.experience,
    education: input.education,
    skills: input.skills,
    projects: input.projects,
    certifications: input.certifications,
  };
}
