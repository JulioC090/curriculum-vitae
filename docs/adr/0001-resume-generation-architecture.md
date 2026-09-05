# ADR 0001: Resume Generation Architecture

- Status: Proposed
- Date: 2026-09-04

## Context

The application accepts structured resume data, generates a LaTeX document, and
renders a PDF. The first release is a stateless Node.js CLI. It must be easy to
extend with new resume fields, templates, and delivery mechanisms without
coupling the workflow to JSON, the filesystem, or `pdflatex`.

The repository uses TypeScript and ESM. PDF rendering requires an external
`pdflatex` executable.

## Decision

Use a semantic, capability-oriented architecture with a thin `core` workflow
layer:

```text
src/
  core/
    generate-resume/
      generate-resume.ts
      ports/
  resume/
    domain/
    input/
  generator/
    latex/
  render/
    pdf/
  cli/
```

The responsibilities are:

- `core`: application workflows and port contracts. It contains no YAML,
  filesystem, LaTeX, or process-execution details.
- `resume/domain`: canonical internal resume types and domain-level values.
- `resume/input`: versioned external YAML directory contract, filesystem
  aggregation, Zod validation, and the mapper from input data to domain data.
- `generator/latex`: the infrastructure implementation of the LaTeX generator
  port. It owns the built-in template and LaTeX escaping.
- `render/pdf`: the infrastructure implementation of the PDF renderer port.
  It owns temporary directories, `pdflatex` invocation, compiler diagnostics,
  and cleanup.
- `cli`: command parsing, adapter composition, human-readable output, and
  process exit codes.

The primary workflow is `GenerateResume`. It depends on these ports:

- `ResumeDataReader`
- `LatexGenerator`
- `DocumentWriter`
- `PdfRenderer`

The workflow reads and validates input, maps it to the domain model, generates
LaTeX, writes the `.tex` file, renders the PDF, and returns both output paths.

## External Input Contract

Version 1 reads a directory with a required `profile.yaml` containing
`schemaVersion: 1`. Each item is an independent YAML file:

```text
data/
  profile.yaml
  skills.yaml
  experience/exp-company.yaml
  education/edu-university.yaml
  projects/project-platform.yaml
  certifications/cert-cloud.yaml
```

`profile.yaml` requires `name` and `email`. Section directories and
`skills.yaml` may be absent. Item IDs and achievement IDs are globally unique;
an item's filename must exactly match its ID. Dates use quoted `YYYY-MM`
strings, with `present` allowed for ongoing periods. Projects and
certifications may define an integer `order`; otherwise entries sort
deterministically by date and ID.

YAML anchors, aliases, custom tags, unknown fields, nested section directories,
and malformed files are rejected. Zod validates the external contract. The
mapper creates separate domain types; Zod schemas are not used as the domain
model. Email and URL fields use basic Zod format validation. Raw LaTeX is not
accepted.

## CLI Contract

The primary command is:

```text
curriculum-vitae generate --output resume.pdf
```

The command also supports `--help`, `--version`, and a diagnostic option for
retaining compiler logs. The output path must have a `.pdf` extension. The
corresponding LaTeX file is written beside it with a `.tex` extension. Existing
outputs are not overwritten unless an explicit `--force` option is supplied.

On success, the CLI prints concise paths for the generated PDF and LaTeX files.
On failure, it prints a human-readable diagnostic to stderr and exits with a
non-zero, category-specific exit code.

## LaTeX and PDF Rendering

The default release has one deterministic built-in template, with optional
runtime template customization. User-controlled text is escaped for LaTeX. The
application never accepts raw LaTeX.

The PDF renderer invokes `pdflatex` directly with an argument array, never via
shell interpolation. Compilation runs in a temporary working directory. On
success, only the requested `.pdf` and `.tex` remain. On failure, the compiler
`.log` is retained beside the requested output as `<basename>.log`; auxiliary
files are otherwise cleaned.

The renderer reports failures rather than treating a failed compiler process as
successful. Missing `pdflatex`, non-zero compiler exit status, and output write
failures are distinct infrastructure failures.

## Error Categories

The core and adapters expose typed failures for:

- Invalid input
- Input read failure
- LaTeX generation failure
- PDF rendering failure
- Output write failure

The CLI maps these categories to distinct non-zero exit codes. The exact
numeric mapping is an implementation detail to be documented with the CLI once
the command implementation is added.

## Security and Safety

- Treat all input data as untrusted.
- Escape every user-controlled value inserted into LaTeX.
- Do not execute user-provided LaTeX.
- Spawn `pdflatex` without a shell.
- Validate the output extension and reject unsafe output behavior.
- Apply reasonable input-size and output-path checks.
- Keep compiler work in a temporary directory.

## Testing and CI

The test suite includes:

- Unit tests for Zod validation and input-to-domain mapping.
  - Unit tests for LaTeX escaping, template generation, and item rendering.
- Core workflow tests with mocked ports.
- CLI tests with mocked dependencies and exit-code assertions.
- A real integration test that generates a fixture resume and invokes
  `pdflatex`, asserting that both `.tex` and `.pdf` are produced.

CI runs `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` in the
normal Node job. The PDF integration test runs in a separate Ubuntu job after
installing a minimal TeX Live package with `apt-get`, including `pdflatex`.
This is preferred over placing the entire Node job in a large TeX container.

## Consequences

This design keeps the workflow testable without a TeX installation and allows
future HTTP or web adapters to reuse the same core workflow. It introduces
explicit mapping and port types, but that cost protects the internal domain
from future input-schema changes.

The initial implementation remains stateless and supports one built-in
template. Persistence, additional templates, JSON Resume import, raw markup,
and web delivery are deliberately deferred.
