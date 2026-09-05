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

export interface Achievement {
  id: string;
  claim: string;
}

export interface Period {
  start: DateValue;
  end?: EndDate;
}

export interface Experience {
  id: string;
  role: string;
  company: string;
  period: Period;
  achievements: Achievement[];
  technologies: string[];
}

export interface Education {
  id: string;
  degree: string;
  institution: string;
  field?: string;
  period: Period;
  achievements: Achievement[];
}

export interface SkillGroup {
  category: string;
  items: string[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  period?: Period;
  order?: number;
  url?: string;
  achievements: Achievement[];
  technologies: string[];
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  issued: DateValue;
  expires?: DateValue;
  order?: number;
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
