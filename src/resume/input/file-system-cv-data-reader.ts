import { readdir, readFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { parseDocument, visit } from 'yaml';
import { ResumeError } from '../../core/errors.js';
import type { ResumeDataReader } from '../../core/generate-resume/ports/index.js';
import {
  certificationItemSchema,
  educationItemSchema,
  experienceItemSchema,
  projectItemSchema,
  profileSchema,
} from './schema.js';

const sections = [
  'experience',
  'education',
  'projects',
  'certifications',
] as const;
type Section = (typeof sections)[number];
const maxInputBytes = 2 * 1024 * 1024;

export class FileSystemResumeDataReader implements ResumeDataReader {
  constructor(private readonly inputPath: string) {}

  async read(): Promise<unknown> {
    try {
      await this.validateRoot();
      const profile = await this.readYamlFile(
        join(this.inputPath, 'profile.yaml'),
      );
      const personal = { ...profile };
      delete personal.schemaVersion;
      const profileResult = profileSchema.safeParse(personal);
      if (!profileResult.success) {
        throw invalid(
          join(this.inputPath, 'profile.yaml'),
          profileResult.error.message,
        );
      }
      const skills = await this.readSkills();
      const result: Record<string, unknown> = {
        schemaVersion: profile.schemaVersion,
        personal,
        skills,
      };

      const ids = new Map<string, string>();
      for (const section of sections) {
        const items = await this.readSection(section, ids);
        result[section] = items;
      }
      return result;
    } catch (error) {
      if (error instanceof ResumeError) throw error;
      throw new ResumeError(
        'input-read',
        `Unable to read resume data directory: ${this.inputPath}`,
        { cause: error },
      );
    }
  }

  private async validateRoot(): Promise<void> {
    const entries = await readdir(this.inputPath, { withFileTypes: true });
    const allowed = new Set([...sections, 'profile.yaml', 'skills.yaml']);
    const unknown = entries.find((entry) => !allowed.has(entry.name));
    if (unknown)
      throw invalid(
        join(this.inputPath, unknown.name),
        'unknown file or directory',
      );
  }

  private async readSkills(): Promise<
    Array<{ category: string; items: string[] }>
  > {
    const path = join(this.inputPath, 'skills.yaml');
    try {
      const value = await this.readYamlFile(path);
      if (!isRecord(value)) throw invalid(path, 'expected a mapping');
      return Object.entries(value).map(([category, items]) => {
        if (
          !Array.isArray(items) ||
          !items.every((item) => typeof item === 'string' && item.length > 0)
        ) {
          throw invalid(
            path,
            `skills.${category} must be a non-empty string array`,
          );
        }
        return { category, items };
      });
    } catch (error) {
      if (isMissing(error)) return [];
      throw error;
    }
  }

  private async readSection(
    section: Section,
    ids: Map<string, string>,
  ): Promise<unknown[]> {
    const directory = join(this.inputPath, section);
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      if (isMissing(error)) return [];
      throw error;
    }

    const files = entries.filter((entry) => entry.isFile());
    const nested = entries.filter((entry) => entry.isDirectory());
    const special = entries.filter(
      (entry) => !entry.isFile() && !entry.isDirectory(),
    );
    if (nested.length > 0) {
      throw invalid(directory, 'nested directories are not supported');
    }
    if (special.length > 0) {
      throw invalid(
        directory,
        `unsupported filesystem entry: ${special[0]?.name}`,
      );
    }
    if (
      files.some((entry) => !['.yaml', '.yml'].includes(extname(entry.name)))
    ) {
      throw invalid(directory, 'only .yaml and .yml files are supported');
    }

    const items = await Promise.all(
      files.map(async (entry) => {
        const path = join(directory, entry.name);
        const item = await this.readYamlFile(path);
        if (!isRecord(item) || typeof item.id !== 'string') {
          throw invalid(path, 'item must contain an id');
        }
        const expectedId = basename(entry.name, extname(entry.name));
        if (item.id !== expectedId) {
          throw invalid(path, `filename must match id ${String(item.id)}`);
        }
        const schema = {
          experience: experienceItemSchema,
          education: educationItemSchema,
          projects: projectItemSchema,
          certifications: certificationItemSchema,
        }[section];
        const validation = schema.safeParse(item);
        if (!validation.success) throw invalid(path, validation.error.message);
        const previous = ids.get(item.id);
        if (previous)
          throw invalid(path, `duplicate id; already defined in ${previous}`);
        ids.set(item.id, path);
        for (const achievement of Array.isArray(item.achievements)
          ? item.achievements
          : []) {
          if (isRecord(achievement) && typeof achievement.id === 'string') {
            const priorAchievement = ids.get(achievement.id);
            if (priorAchievement)
              throw invalid(
                path,
                `duplicate id; already defined in ${priorAchievement}`,
              );
            ids.set(achievement.id, path);
          }
        }
        return item;
      }),
    );
    return items.sort((a, b) => compareItems(section, a, b));
  }

  private async readYamlFile(path: string): Promise<Record<string, unknown>> {
    const contents = await readFile(path);
    if (contents.byteLength > maxInputBytes) {
      throw new ResumeError(
        'input-read',
        `Input file exceeds the 2 MiB size limit: ${path}`,
      );
    }
    try {
      const source = contents.toString('utf8');
      const document = parseDocument(source, {
        version: '1.2',
        uniqueKeys: true,
      });
      if (document.errors.length > 0) throw document.errors[0];
      visit(document, (_key, node) => {
        if (
          node &&
          typeof node === 'object' &&
          (node.constructor.name === 'Alias' ||
            ('anchor' in node && node.anchor) ||
            ('tag' in node && node.tag))
        ) {
          throw new Error(
            'YAML anchors, aliases, and custom tags are not supported',
          );
        }
      });
      const value = document.toJS() as unknown;
      if (!isRecord(value)) throw new Error('expected a YAML mapping');
      return value;
    } catch (error) {
      throw invalid(path, String(error));
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isMissing(error: unknown): boolean {
  return isRecord(error) && error.code === 'ENOENT';
}

function invalid(path: string, message: string): ResumeError {
  return new ResumeError('invalid-input', `${path}: ${message}`);
}

function compareItems(
  section: Section,
  left: Record<string, unknown>,
  right: Record<string, unknown>,
): number {
  const order = (item: Record<string, unknown>) =>
    typeof item.order === 'number' ? item.order : Number.POSITIVE_INFINITY;
  if (section === 'projects' || section === 'certifications') {
    const leftOrder = order(left);
    const rightOrder = order(right);
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
  }
  const leftDate = itemDate(section, left);
  const rightDate = itemDate(section, right);
  if (leftDate && rightDate && leftDate !== rightDate)
    return rightDate.localeCompare(leftDate);
  if (leftDate && !rightDate) return -1;
  if (!leftDate && rightDate) return 1;
  return String(left.id).localeCompare(String(right.id));
}

function itemDate(
  section: Section,
  item: Record<string, unknown>,
): string | undefined {
  if (section === 'certifications') {
    return typeof item.issued === 'string' ? item.issued : undefined;
  }
  if (!isRecord(item.period)) return undefined;
  return typeof item.period.start === 'string' ? item.period.start : undefined;
}
