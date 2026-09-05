import type { DateValue, Resume } from '../../resume/domain/resume.js';
import { escapeLatex } from './latex-escaping.js';

export interface ResumeViewModel {
  personal: {
    name: string;
    email: string;
    phone: string;
    location: string;
    website: string;
    summary: string;
  };
  experience: Array<{
    role: string;
    company: string;
    startDate: string;
    endDate: string;
    achievements: string[];
    technologies: string[];
  }>;
  education: Array<{
    degree: string;
    institution: string;
    startDate: string;
    endDate: string;
    field: string;
    achievements: string[];
  }>;
  skills: Array<{ category: string; items: string[] }>;
  projects: Array<{
    name: string;
    description: string;
    startDate: string;
    endDate: string;
    url: string;
    achievements: string[];
    technologies: string[];
  }>;
  certifications: Array<{
    name: string;
    issuer: string;
    date: string;
    expires: string;
    url: string;
    credentialId: string;
  }>;
}

function date(value: DateValue | 'present' | undefined): string {
  if (!value) return '';
  return value === 'present'
    ? 'Present'
    : `${value.month ? `${String(value.month).padStart(2, '0')}/` : ''}${value.year}`;
}

const text = (value: string | undefined): string => escapeLatex(value ?? '');

export function toResumeViewModel(resume: Resume): ResumeViewModel {
  return {
    personal: {
      name: text(resume.personal.name),
      email: text(resume.personal.email),
      phone: text(resume.personal.phone),
      location: text(resume.personal.location),
      website: text(resume.personal.website),
      summary: text(resume.personal.summary),
    },
    experience: resume.experience.map((item) => ({
      role: text(item.role),
      company: text(item.company),
      startDate: date(item.period.start),
      endDate: date(item.period.end),
      achievements: item.achievements.map((achievement) =>
        text(achievement.claim),
      ),
      technologies: item.technologies.map(text),
    })),
    education: resume.education.map((item) => ({
      degree: text(item.degree),
      institution: text(item.institution),
      startDate: date(item.period.start),
      endDate: date(item.period.end),
      field: text(item.field),
      achievements: item.achievements.map((achievement) =>
        text(achievement.claim),
      ),
    })),
    skills: resume.skills.map((item) => ({
      category: text(item.category),
      items: item.items.map(text),
    })),
    projects: resume.projects.map((item) => ({
      name: text(item.name),
      description: text(item.description),
      startDate: date(item.period?.start),
      endDate: date(item.period?.end),
      url: text(item.url),
      achievements: item.achievements.map((achievement) =>
        text(achievement.claim),
      ),
      technologies: item.technologies.map(text),
    })),
    certifications: resume.certifications.map((item) => ({
      name: text(item.name),
      issuer: text(item.issuer),
      date: date(item.issued),
      expires: date(item.expires),
      url: text(item.url),
      credentialId: text(item.credentialId),
    })),
  };
}
