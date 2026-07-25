---
name: rapidx:workflow-intake-requirements
description: Ingest a human/externally-authored requirements.md and structure it into per-process logic models (Comprehend stage, path B)
allowed-tools:
  - Read
  - Write
---

<objective>
Take a human-written or externally-extracted `requirements.md` describing an
existing workflow application's business functionality, and structure it
into the same per-process artifact shape that codebase comprehension
(`/rapidx:workflow-comprehend`) produces — so both intake paths converge on
one downstream pipeline.
</objective>

<process>
1. Locate the input file — default `.rapidx/migration/requirements/requirements.md`,
   or a path passed via `--requirements <path>` (copy it into
   `.rapidx/migration/requirements/requirements.md` as the canonical spine if
   found elsewhere).

2. If the file declares a source platform (Pega/BAW/Appian/MuleSoft), load
   the matching `workflow-parity-<platform>` skill so process boundaries and
   terminology get mapped consistently. If no source platform is declared,
   proceed platform-agnostic — this path also supports pure greenfield
   requirements with no legacy system at all.

3. For each business process described in the document, delegate to
   `workflow-logic-extractor` to produce
   `.rapidx/migration/processes/<slug>/logic-model.json` — using the
   requirements text as the sole source (no source code to cross-reference,
   so flag anything genuinely ambiguous as `NEEDS_CLARIFICATION` rather than
   inventing behavior).

4. If the requirements document describes forms/data fields inline,
   delegate to `workflow-forms-generator` for `forms.json`, otherwise leave
   forms to be authored during Blueprint.

5. Update `.rapidx/migration/manifest.json`: set `intake_path: "requirements"`
   and list each discovered process with status `logic-model-ready`.

6. Report the process list, any `NEEDS_CLARIFICATION` flags requiring the
   user's input before Reimagine can start, and the recommended next command
   (`/rapidx:workflow-reimagine`).
</process>
