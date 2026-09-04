import type { LatexGenerator } from '../../core/generate-resume/ports/index.js';
import type { DateValue, Resume } from '../../resume/domain/resume.js';

export function escapeLatex(value: string): string {
  return value.replace(
    /[\\{}$&#%_~^]/g,
    (character) =>
      ({
        '\\': '\\textbackslash{}',
        '{': '\\{',
        '}': '\\}',
        $: '\\$',
        '&': '\\&',
        '#': '\\#',
        '%': '\\%',
        _: '\\_',
        '~': '\\textasciitilde{}',
        '^': '\\textasciicircum{}',
      })[character] ?? character,
  );
}

function date(value: DateValue | 'present' | undefined): string {
  if (!value) return '';
  return value === 'present'
    ? 'Present'
    : `${value.month ? `${String(value.month).padStart(2, '0')}/` : ''}${value.year}`;
}

const bullets = (items: string[]) =>
  items.length
    ? `\\begin{itemize}\n${items.map((item) => `  \\item ${escapeLatex(item)}`).join('\n')}\n\\end{itemize}`
    : '';

export class BuiltInLatexGenerator implements LatexGenerator {
  generate(resume: Resume): string {
    const sections: string[] = [];
    const p = resume.personal;
    sections.push(
      `\\begin{center}\n{\\LARGE \\textbf{${escapeLatex(p.name)}}}\\\\\n${escapeLatex(p.email)}${p.phone ? ` \\textbar{} ${escapeLatex(p.phone)}` : ''}${p.location ? ` \\textbar{} ${escapeLatex(p.location)}` : ''}${p.website ? ` \\textbar{} ${escapeLatex(p.website)}` : ''}\n\\end{center}`,
    );
    if (p.summary)
      sections.push(`\\section*{Summary}\n${escapeLatex(p.summary)}`);
    if (resume.experience.length)
      sections.push(
        `\\section*{Experience}\n${resume.experience.map((item) => `\\textbf{${escapeLatex(item.role)}} -- ${escapeLatex(item.company)}\\hfill ${date(item.startDate)}--${date(item.endDate)}\\\\\n${bullets(item.description)}`).join('\n\n')}`,
      );
    if (resume.education.length)
      sections.push(
        `\\section*{Education}\n${resume.education.map((item) => `\\textbf{${escapeLatex(item.degree)}} -- ${escapeLatex(item.institution)}\\hfill ${date(item.startDate)}--${date(item.endDate)}`).join('\\\\\n')}`,
      );
    if (resume.skills.length)
      sections.push(
        `\\section*{Skills}\n${resume.skills.map((item) => `\\textbf{${escapeLatex(item.category)}:} ${item.items.map(escapeLatex).join(', ')}`).join('\\\\\n')}`,
      );
    if (resume.projects.length)
      sections.push(
        `\\section*{Projects}\n${resume.projects.map((item) => `\\textbf{${escapeLatex(item.name)}}${item.url ? ` (${escapeLatex(item.url)})` : ''}\\\\\n${bullets(item.description)}${item.technologies.length ? `${item.description.length ? '\n' : ''}\\emph{Technologies:} ${item.technologies.map(escapeLatex).join(', ')}` : ''}`).join('\n\n')}`,
      );
    if (resume.certifications.length)
      sections.push(
        `\\section*{Certifications}\n${resume.certifications.map((item) => `\\textbf{${escapeLatex(item.name)}} -- ${escapeLatex(item.issuer)} (${date(item.date)})${item.url ? `, ${escapeLatex(item.url)}` : ''}${item.credentialId ? `, ${escapeLatex(item.credentialId)}` : ''}`).join('\\\\\n')}`,
      );
    return `\\documentclass[11pt]{article}\n\\usepackage[margin=0.75in]{geometry}\n\\usepackage[T1]{fontenc}\n\\pagestyle{empty}\n\\begin{document}\n${sections.join('\n\n')}\n\\end{document}\n`;
  }
}
