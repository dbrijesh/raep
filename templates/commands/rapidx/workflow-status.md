---
name: rapidx:workflow-status
description: Read-only status board for the active workflow modernization engagement
allowed-tools:
  - Read
---

<objective>
Give the user a single, accurate snapshot of engagement progress across
every process, without changing any state — safe to run at any time,
including mid-gate.
</objective>

<process>
1. Read `.rapidx/migration/manifest.json`. If missing, tell the user no
   workflow-modernization engagement is initialized yet (recommend
   `/rapidx:workflow-modernize`) and stop.

2. Read `inventory.json`/`dependency-graph.json` if present (path A), and
   list every process under `.rapidx/migration/processes/*/`.

3. For each process, determine its furthest-completed stage by checking
   for the presence of: `logic-model.json` (Comprehend/Intake done) →
   a section in `.rapidx/migration/blueprint/reimagine.md` (Reimagine
   drafted) → `definitions/<slug>/v1.json` (Blueprint done) → an entry in
   `.rapidx/migration/manifest.json`'s forward-engineered list
   (Forward-Engineer done) → a row in the relevant
   `parity-reports/<platform>.md` (parity-reviewed).

4. For each process, also note whether it is currently blocked on a review
   gate: unresolved `NEEDS_ARCHITECT_DECISION` markers in `reimagine.md` or
   `blueprint.md`, or `NEEDS_REVIEW`/sub-Full fidelity rows in its parity
   report.

5. Render a table: process | source platform | current stage | gate status
   | open flags. Follow with an overall summary (counts per stage,
   fan-in/dependency-order notes from `dependency-graph.json` if present)
   and the single recommended next command for the user to run.

Never modify any file in `.rapidx/migration/` — this command only reads.
</process>
