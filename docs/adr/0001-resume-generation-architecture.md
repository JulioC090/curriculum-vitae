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

- `core`: application workflows and port contracts. It contains no JSON,
  filesystem, LaTeX, or process-execution details.
- `resume/domain`: canonical internal resume types and domain-level values.
- `resume/input`: versioned external JSON contract, Zod validation, and the
  mapper from input data to domain data.
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

Version 1 accepts JSON with a required root `schemaVersion` of `1`:

```json
{
  "schemaVersion": 1,
  "personal": {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "+1 555 0100",
    "location": "City, Country",
    "website": "https://example.com",
    "summary": "Software engineer focused on reliable systems."
  },
  "experience": [
    {
      "role": "Senior Engineer",
      "company": "Example Inc.",
      "startDate": { "year": 2022, "month": 1 },
      "endDate": "present",
      "description": ["Built and operated a production platform."]
    }
  ],
  "education": [
    {
      "degree": "BSc Computer Science",
      "institution": "Example University",
      "startDate": { "year": 2016 },
      "endDate": { "year": 2020 }
    }
  ],
  "skills": [
    {
      "category": "Languages",
      "items": ["TypeScript", "Go"]
    }
  ],
  "projects": [
    {
      "name": "Resume Generator",
      "description": ["Generates reproducible resume PDFs."],
      "url": "https://example.com/project",
      "technologies": ["TypeScript"]
    }
  ],
  "certifications": [
    {
      "name": "Example Certification",
      "issuer": "Example Org",
      "date": { "year": 2024 },
      "url": "https://example.com/certificate",
      "credentialId": "ABC-123"
    }
  ]
}
```

The required fields are `personal.name` and `personal.email`. Optional arrays
may be absent or empty. Empty sections are omitted from the generated document.
Experience and project descriptions are arrays of plain-text bullet strings.
Dates use `{ year, month? }`; an experience end date may additionally be the
distinct value `"present"`.

Zod validates the external contract. The mapper creates separate domain types;
Zod schemas are not used as the domain model. Email and URL fields use basic
Zod format validation. Raw LaTeX is not accepted.

## CLI Contract

The primary command is:

```text
curriculum-vitae generate --input resume.json --output resume.pdf
```

The command also supports `--help`, `--version`, and a diagnostic option for
retaining compiler logs. The output path must have a `.pdf` extension. The
corresponding LaTeX file is written beside it with a `.tex` extension. Existing
outputs are not overwritten unless an explicit `--force` option is supplied.

On success, the CLI prints concise paths for the generated PDF and LaTeX files.
On failure, it prints a human-readable diagnostic to stderr and exits with a
non-zero, category-specific exit code.

## LaTeX and PDF Rendering

The first release has one deterministic built-in template and no runtime
template customization. User-controlled text is escaped for LaTeX. The
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
- Unit tests for LaTeX escaping and template generation.
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
