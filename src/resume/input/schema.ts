import { z } from 'zod';

const date = z.object({
  year: z.number().int().min(1).max(9999),
  month: z.number().int().min(1).max(12).optional(),
});
const text = z.string().min(1);

export const resumeInputSchema = z
  .object({
    schemaVersion: z.literal(1),
    personal: z.object({
      name: text,
      email: z.email(),
      phone: text.optional(),
      location: text.optional(),
      website: z.url().optional(),
      summary: text.optional(),
    }),
    experience: z
      .array(
        z.object({
          role: text,
          company: text,
          startDate: date,
          endDate: z.union([date, z.literal('present')]).optional(),
          description: z.array(text),
        }),
      )
      .optional()
      .default([]),
    education: z
      .array(
        z.object({
          degree: text,
          institution: text,
          startDate: date,
          endDate: date.optional(),
        }),
      )
      .optional()
      .default([]),
    skills: z
      .array(z.object({ category: text, items: z.array(text) }))
      .optional()
      .default([]),
    projects: z
      .array(
        z.object({
          name: text,
          description: z.array(text),
          url: z.url().optional(),
          technologies: z.array(text),
        }),
      )
      .optional()
      .default([]),
    certifications: z
      .array(
        z.object({
          name: text,
          issuer: text,
          date,
          url: z.url().optional(),
          credentialId: text.optional(),
        }),
      )
      .optional()
      .default([]),
  })
  .strict();

export type ResumeInput = z.infer<typeof resumeInputSchema>;
