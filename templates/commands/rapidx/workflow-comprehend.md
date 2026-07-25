---
name: rapidx:workflow-comprehend
description: Comprehend an existing legacy workflow codebase/export and synthesize the requirements.md-shaped spine (Comprehend stage, path A)
allowed-tools:
  - Read
  - Grep
  - Glob
  - Write
  - Task
---

<objective>
Given `--source <path>` pointing at an existing legacy workflow application's
source or export (Appian application export, Pega ruleset export, IBM BAW
project interchange file, MuleSoft project directory, or just a live
codebase checkout), extract its business processes and produce the same
downstream artifacts that `/rapidx:workflow-intake-requirements` produces
from a human-authored doc — so both intake paths converge on one pipeline.

Extraction is agent-driven (Read/Grep over the source) for v1, not a
bespoke per-platform export parser — export formats vary enough between
versions and platforms that a hand-rolled parser is a poor early investment;
revisit if a specific customer's export proves too irregular for agent-driven
extraction.
</objective>

<process>
1. **Detect or confirm source platform** — look for platform fingerprints
   (Appian: `.zip` export with `processModel/`, `expressionRule/`,
   `recordType/` dirs or a `customization.properties`; Pega: rulesets/`.rap`
   archives; IBM BAW: BPMN/DMN XML + a `.twx`/project interchange file;
   MuleSoft: `mule-artifact.json` + `src/main/mule/*.xml`). If ambiguous, ask
   the user rather than guessing — the wrong `workflow-parity-<platform>`
   skill produces wrong node-type mappings.

2. **Estate inventory** — delegate to `migration-analyst` in Workflow
   Modernization Mode: enumerate every process/case type/flow found, its
   source platform, and owning business area. Write
   `.rapidx/migration/inventory.json`.

3. **Per-process logic extraction** — for each inventoried process, delegate
   to `workflow-logic-extractor` (loading the matching
   `workflow-parity-<platform>` skill first) to produce
   `.rapidx/migration/processes/<slug>/logic-model.json`.

4. **Dependency mapping** — delegate to `workflow-dependency-mapper` across
   the full inventory to produce `.rapidx/migration/dependency-graph.json`,
   including cross-process and cross-system edges and any
   `unresolved_integrations`.

5. **Forms extraction** — for each process, delegate to
   `workflow-forms-generator` to produce
   `.rapidx/migration/processes/<slug>/forms.json` from the source
   platform's UI/form definitions.

6. **Synthesize the shared spine** — write
   `.rapidx/migration/requirements/requirements.md`: one section per process,
   plain-language description of its purpose, actors, steps, and business
   rules, derived from the logic models — this is the requirements.md
   equivalent that path B would have received directly, so downstream
   Reimagine/Blueprint/Forward-Engineer agents never need to know which
   intake path was used.

7. **Parity pre-check** — cross-reference each extracted construct against
   the `workflow-parity-<platform>` skill's table; anything landing on a
   **Partial** or **Roadmap** row gets flagged in the inventory now, not
   discovered later during Forward-Engineer.

8. Update `.rapidx/migration/manifest.json`: `intake_path: "comprehend"`,
   `source_platforms: [...]`, per-process status `logic-model-ready`.

9. Report: process count, dependency-graph summary (fan-in outliers =
   migration-order constraints), unresolved integrations,
   `NEEDS_CLARIFICATION` flags, and recommended next command
   (`/rapidx:workflow-reimagine`).
</process>
