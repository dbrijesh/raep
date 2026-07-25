---
name: workflow-modernization-method
description: RapidX workflow modernization method skill — the four-stage Comprehend/Reimagine/Blueprint/Forward-Engineer method for migrating legacy BPM/low-code workflow applications to a production-grade target platform.
origin: RapidX
---

# Skill: Workflow Modernization Method

## Purpose

The end-to-end method for migrating legacy workflow/BPM applications
(Pega, IBM BAW, Appian, MuleSoft) — via either an existing codebase/export or
a human-authored `requirements.md` — into a production-grade custom
application built on the RapidX workflow platform scaffold (BPMN/Spiff
engine, task/rules/forms/audit/e-sign services, agentic AI layer). Both
intake paths converge on the same downstream pipeline.

## When to use

- Any engagement with `profile_id: workflow-modernization` active.
- Kicking off, resuming, or reviewing progress on a legacy workflow migration.

## The four stages

### 1. Comprehend (AI-augmented)
Understand what exists today. Two intake paths, same output shape:
- **Path A — codebase/estate comprehension**: run `/rapidx:workflow-comprehend
  --source <path>`. `migration-analyst` inventories the estate,
  `workflow-logic-extractor` extracts per-process logic models,
  `workflow-dependency-mapper` builds the dependency graph,
  `workflow-forms-generator` extracts forms. Synthesizes
  `.rapidx/migration/requirements/requirements.md` — a requirements.md-shaped
  artifact equivalent to path B's input.
- **Path B — requirements intake**: run `/rapidx:workflow-intake-requirements`
  against a human/externally-authored `requirements.md` directly; skips
  extraction, goes straight to structuring it into per-process logic models.
- Output either way: `.rapidx/migration/requirements/requirements.md`,
  `inventory.json` (path A), `dependency-graph.json` (path A),
  `processes/<slug>/logic-model.json` per process.

### 2. Reimagine (architect-led)
Given each logic model, `workflow-topology-architect` proposes what each
legacy step becomes on the target platform — not lift-and-shift, but a
deliberate redesign identifying agentic-AI opportunities while preserving
compliance-critical steps verbatim. **Gate:** a human architect must approve
`blueprint/reimagine.md` before Blueprint begins (`reimagine-review` review
gate).

### 3. Blueprint (architect-led)
`workflow-blueprint-architect` turns the approved Reimagine design plus
`workflow-data-modeler`'s data model and `workflow-forms-generator`'s forms
into the concrete, buildable design: canonical `graph_json` workflow
definitions (`definitions/<slug>/v1.json`), the compliance control map, and
the process manifest. Blueprint must resolve all ambiguity — nothing
downstream should require further judgment calls. **Gate:** `blueprint-review`.

### 4. Forward-Engineer (AI-augmented)
`workflow-forward-engineer` stamps the platform scaffold (once per
engagement, via `--stamp-workflow-scaffold`) and generates the
workload-specific code for each process: data models, forms wiring,
agent_step pipelines, and UI pages. Produces a parity report per process
against the source platform. **Gate:** `parity-review` before cutover.

## Command reference

| Command | Stage | Notes |
|---|---|---|
| `/rapidx:workflow-modernize` | orchestrator | Routes to comprehend or intake-requirements based on `--source` presence |
| `/rapidx:workflow-intake-requirements` | Comprehend (path B) | |
| `/rapidx:workflow-comprehend` | Comprehend (path A) | |
| `/rapidx:workflow-reimagine` | Reimagine | Pauses at `reimagine-review` |
| `/rapidx:workflow-blueprint` | Blueprint | Pauses at `blueprint-review` |
| `/rapidx:workflow-forward-engineer` | Forward-Engineer | Stamps scaffold + generates code |
| `/rapidx:workflow-status` | any | Read-only board of `.rapidx/migration/manifest.json` |

## Anti-patterns to avoid

- Skipping the Reimagine gate and forward-engineering a literal lift-and-shift
  — defeats the purpose of modernization.
- Generating code before Blueprint has resolved every `NEEDS_CLARIFICATION` /
  `NEEDS_REVIEW` flag from the earlier stages.
- Treating agentic-AI steps as autonomous by default — human-in-the-loop
  unless the profile's governance section says otherwise.
- Hand-writing the platform base layer instead of stamping the scaffold —
  every engagement should share the same hardened, audited base.
