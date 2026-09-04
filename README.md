# Curriculum Vitae

Generate a PDF resume and the LaTeX source used to create it from structured
JSON data.

## Status

The architecture and version 1 contract are specified in
[`docs/adr/0001-resume-generation-architecture.md`](docs/adr/0001-resume-generation-architecture.md).
The initial implementation is available through the `generate` command.

## Planned Usage

```text
curriculum-vitae generate --input resume.json --output resume.pdf
```

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
