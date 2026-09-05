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
