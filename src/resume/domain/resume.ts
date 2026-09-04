export type DateValue = { year: number; month?: number };
export type EndDate = DateValue | 'present';

export interface PersonalDetails {
  name: string;
  email: string;
  phone?: string;
  location?: string;
  website?: string;
  summary?: string;
}

export interface Experience {
  role: string;
  company: string;
  startDate: DateValue;
  endDate?: EndDate;
  description: string[];
}

export interface Education {
  degree: string;
  institution: string;
  startDate: DateValue;
  endDate?: DateValue;
}

export interface SkillGroup {
  category: string;
  items: string[];
}

export interface Project {
  name: string;
  description: string[];
  url?: string;
  technologies: string[];
}

export interface Certification {
  name: string;
  issuer: string;
  date: DateValue;
  url?: string;
  credentialId?: string;
}

export interface Resume {
  personal: PersonalDetails;
  experience: Experience[];
  education: Education[];
  skills: SkillGroup[];
  projects: Project[];
  certifications: Certification[];
}
