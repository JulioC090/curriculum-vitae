# Curriculum Vitae

Generate a PDF resume and the LaTeX source used to create it from an editable
directory of structured YAML files.

## Status

The architecture and version 1 contract are specified in
[`docs/adr/0001-resume-generation-architecture.md`](docs/adr/0001-resume-generation-architecture.md).
The initial implementation is available through the `generate` command.

## Planned Usage

```text
curriculum-vitae generate --output resume.pdf
curriculum-vitae generate --input examples/data --output resume.pdf
```

The default input directory is `./data`. It must contain `profile.yaml`; the
`experience`, `education`, `projects`, and `certifications` directories and
`skills.yaml` are optional. Each item is stored in its own YAML file, and its
filename must match its lowercase kebab-case `id`. See [`examples/data`](examples/data)
for a complete fixture.

The command will produce `resume.pdf` and `resume.tex` beside the requested
output. PDF generation requires `pdflatex`.

## Development

The project uses Node.js 24, pnpm, TypeScript, and Vitest. The expected checks
are:

```text
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```
