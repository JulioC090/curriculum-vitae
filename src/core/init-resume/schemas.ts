import { z } from 'zod';

const text = z.string().min(1);
const month = z.string().regex(/^(?:[0-9]{4})-(?:0[1-9]|1[0-2])$/);
const period = z
  .object({
    start: month,
    end: z.union([month, z.literal('present')]).optional(),
  })
  .strict();
const achievement = z.object({ claim: text }).strict();
const achievements = z.array(achievement).default([]);
const technologies = z.array(text).default([]);

export const resumeExtractionSchema = z
  .object({
    personal: z
      .object({
        name: text,
        email: z.email(),
        phone: text.optional(),
        location: text.optional(),
        website: z.url().optional(),
        summary: text.optional(),
      })
      .strict(),
    experience: z
      .array(
        z
          .object({
            role: text,
            company: text,
            period,
            achievements: z.array(achievement).min(1),
            technologies,
          })
          .strict(),
      )
      .default([]),
    education: z
      .array(
        z
          .object({
            degree: text,
            institution: text,
            field: text.optional(),
            period,
            achievements,
          })
          .strict(),
      )
      .default([]),
    skills: z
      .array(z.object({ category: text, items: z.array(text) }).strict())
      .default([]),
    projects: z
      .array(
        z
          .object({
            name: text,
            description: text,
            period: period.optional(),
            order: z.number().int().optional(),
            url: z.url().optional(),
            achievements,
            technologies,
          })
          .strict(),
      )
      .default([]),
    certifications: z
      .array(
        z
          .object({
            name: text,
            issuer: text,
            issued: month,
            expires: month.optional(),
            order: z.number().int().optional(),
            url: z.url().optional(),
            credentialId: text.optional(),
          })
          .strict(),
      )
      .default([]),
  })
  .strict();

export type ResumeExtraction = z.infer<typeof resumeExtractionSchema>;
