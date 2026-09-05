import { z } from 'zod';

const text = z.string().min(1);
const id = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const month = z.string().regex(/^(?:[0-9]{4})-(?:0[1-9]|1[0-2])$/);
const period = z
  .object({
    start: month,
    end: z.union([month, z.literal('present')]).optional(),
  })
  .strict();
const achievement = z.object({ id, claim: text }).strict();
const achievements = z.array(achievement).default([]);
const technologies = z.array(text).default([]);

export const profileSchema = z
  .object({
    name: text,
    email: z.email(),
    phone: text.optional(),
    location: text.optional(),
    website: z.url().optional(),
    summary: text.optional(),
  })
  .strict();

export const experienceItemSchema = z
  .object({
    id,
    role: text,
    company: text,
    period,
    achievements: z.array(achievement).min(1),
    technologies,
  })
  .strict();

export const educationItemSchema = z
  .object({
    id,
    degree: text,
    institution: text,
    field: text.optional(),
    period,
    achievements,
  })
  .strict();

export const projectItemSchema = z
  .object({
    id,
    name: text,
    description: text,
    period: period.optional(),
    order: z.number().int().optional(),
    url: z.url().optional(),
    achievements,
    technologies,
  })
  .strict();

export const certificationItemSchema = z
  .object({
    id,
    name: text,
    issuer: text,
    issued: month,
    expires: month.optional(),
    order: z.number().int().optional(),
    url: z.url().optional(),
    credentialId: text.optional(),
  })
  .strict();

export const resumeInputSchema = z
  .object({
    schemaVersion: z.literal(1),
    personal: profileSchema,
    experience: z.array(experienceItemSchema).default([]),
    education: z.array(educationItemSchema).default([]),
    skills: z
      .array(z.object({ category: text, items: z.array(text) }).strict())
      .optional()
      .default([]),
    projects: z.array(projectItemSchema).default([]),
    certifications: z.array(certificationItemSchema).default([]),
  })
  .strict();

export type ResumeInput = z.infer<typeof resumeInputSchema>;
