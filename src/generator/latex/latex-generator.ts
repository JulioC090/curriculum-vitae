import Handlebars from 'handlebars';
import type { LatexGenerator } from '../../core/generate-resume/ports/index.js';
import { ResumeError } from '../../core/errors.js';
import type { Resume } from '../../resume/domain/resume.js';
import { toResumeViewModel } from './resume-view-model.js';
import { readTemplate } from './template-resolver.js';
export { escapeLatex } from './latex-escaping.js';

export class BuiltInLatexGenerator implements LatexGenerator {
  private readonly template: Handlebars.TemplateDelegate;

  constructor(templatePath?: string) {
    let source: string;
    try {
      source = readTemplate(templatePath);
      this.template = Handlebars.compile(source, {
        noEscape: true,
        strict: true,
      });
    } catch (error) {
      if (error instanceof ResumeError) throw error;
      throw new ResumeError(
        'latex-generation',
        `Invalid template: ${String(error)}`,
        {
          cause: error,
        },
      );
    }
  }

  generate(resume: Resume): string {
    try {
      return this.template(toResumeViewModel(resume));
    } catch (error) {
      if (error instanceof ResumeError) throw error;
      throw new ResumeError(
        'latex-generation',
        `Unable to render template: ${String(error)}`,
        {
          cause: error,
        },
      );
    }
  }
}
