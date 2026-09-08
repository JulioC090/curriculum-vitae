# Curriculum Vitae

Generate a PDF resume and the LaTeX source used to create it from an editable
directory of structured YAML files.

## Status

The architecture and version 1 contract are specified in
[`docs/adr/0001-resume-generation-architecture.md`](docs/adr/0001-resume-generation-architecture.md).
The implementation is available through the `init` and `generate` commands.

## Usage

```text
curriculum-vitae generate --output resume.pdf
curriculum-vitae generate --input examples/data --output resume.pdf
curriculum-vitae init --linkedin ./Profile.pdf --output ./data
```

`init` extracts text from a LinkedIn profile PDF, uses a LangChain structured
output model through OpenRouter, validates the result, and writes the editable
YAML data layout. Set the provider configuration before running it:

```text
export OPENROUTER_API_KEY=...
export OPENROUTER_MODEL=...
export OPENROUTER_HTTP_REFERER=https://example.com   # optional
export OPENROUTER_X_TITLE="Curriculum Vitae"         # optional
curriculum-vitae init --linkedin ./Profile.pdf --output ./data
```

The same variables can be placed in a `.env` file in the project directory;
the CLI loads it automatically. Do not commit that file.

The command is non-interactive. It refuses to replace existing resume data
unless `--force` is supplied. Large extracted text is rejected with a warning;
use `--allow-large-input` to continue. Generated IDs are deterministic and the
output is staged before it replaces generated files, while unrelated files in
the destination are preserved.

The default input directory is `./data`. It must contain `profile.yaml`; the
`experience`, `education`, `projects`, and `certifications` directories and
`skills.yaml` are optional. Each item is stored in its own YAML file, and its
filename must match its lowercase kebab-case `id`. See [`examples/data`](examples/data)
for a complete fixture.

Files created by `init` include optional provenance as their final top-level
field. LinkedIn imports use this shape in every generated YAML file:

```yaml
sources:
  linkedin:
    imported_at: 2026-09-05
    version: 1
```

The `sources` field is validated but omitted from the resume domain model, so it
does not affect generated LaTeX or PDF output. Existing files without
provenance remain valid.

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
