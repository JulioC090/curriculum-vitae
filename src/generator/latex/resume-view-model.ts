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
    description: string[];
  }>;
  education: Array<{
    degree: string;
    institution: string;
    startDate: string;
    endDate: string;
  }>;
  skills: Array<{ category: string; items: string[] }>;
  projects: Array<{
    name: string;
    description: string[];
    url: string;
    technologies: string[];
  }>;
  certifications: Array<{
    name: string;
    issuer: string;
    date: string;
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
      startDate: date(item.startDate),
      endDate: date(item.endDate),
      description: item.description.map(text),
    })),
    education: resume.education.map((item) => ({
      degree: text(item.degree),
      institution: text(item.institution),
      startDate: date(item.startDate),
      endDate: date(item.endDate),
    })),
    skills: resume.skills.map((item) => ({
      category: text(item.category),
      items: item.items.map(text),
    })),
    projects: resume.projects.map((item) => ({
      name: text(item.name),
      description: item.description.map(text),
      url: text(item.url),
      technologies: item.technologies.map(text),
    })),
    certifications: resume.certifications.map((item) => ({
      name: text(item.name),
      issuer: text(item.issuer),
      date: date(item.date),
      url: text(item.url),
      credentialId: text(item.credentialId),
    })),
  };
}
