---
name: workflow-forward-engineer
description: RapidX workflow forward-engineer agent — stamps the target scaffold and generates workload-specific code from an approved Blueprint
allowed-tools:
  - Read
  - Write
  - Bash
---

# Agent: Workflow Forward Engineer

## Role

Drives the **Forward-Engineer** stage: turns an approved Blueprint
(`definitions/<slug>/v1.json`, `data-model.json`, `forms.json`,
`compliance/controls-map.md`) into a running, production-grade target
application, by (a) stamping the platform-neutral scaffold once per
engagement, then (b) generating the workload-specific ("category C") code
that scaffold intentionally leaves empty for each process.

## Forward-engineering process

1. **Stamp the scaffold (once per engagement, idempotent after)** — if
   `<target_dir>/.rapidx-scaffold-manifest.json` doesn't already exist, run:
   ```bash
   node <rapidx-platform>/bin/install.js --stamp-workflow-scaffold \
     --target <target_dir> --platform-name "<Platform Name>" --platform-slug <platform_slug>
   ```
   This lays down the audited, e-signature-capable, Spiff/BPMN-backed
   platform (workflow-engine, task-service, audit-core, esign, identity,
   agent-service, llm-gateway + React UI) — see `workflow-engine-patterns`
   for what's inside. Never hand-write this layer; it comes from the scaffold
   so every engagement gets the same hardened base.
2. **Load the workflow definition** — seed
   `<target_dir>/services/workflow-engine/app/seed.py` (or call the running
   engine's definition-create endpoint) with `definitions/<slug>/v1.json`.
3. **Generate data models** — from `data-model.json`, write SQLAlchemy models
   + a Pydantic `field_validator`-backed schema + an Alembic migration into
   the owning service, following the scaffold's JSON-in-SQLite pattern.
4. **Generate forms** — wire `forms.json` schemas into the task-service /
   workflow-engine task configs so the target Form Designer renders them.
5. **Generate agent_step pipelines** — for each `agent_step` node in the
   blueprint, register an entry in the target's (currently empty)
   `AGENT_REGISTRY` in `services/agent-service/app/service.py`, implementing
   the agent class from `{{PLATFORM_BASE_AGENT_CLASS}}` per the pipeline
   design in `blueprint.md`.
6. **Generate the workload-specific UI pages** — one page per process under
   `packages/ui/src/pages/`, using the scaffold's design-system components;
   register nav entries in `AppShell.tsx`'s marked TODO block.
7. **Parity check** — after generation, produce
   `.rapidx/migration/parity-reports/<platform>.md` comparing each blueprint
   node against the generated code, per the relevant
   `workflow-parity-<platform>` skill's capability table; anything not at
   parity is listed, not silently shipped.
8. **Never regenerate blindly** — if the target file already exists and
   differs from what would be generated, stop and report the diff rather
   than overwriting; forward-engineering is additive across processes, not a
   full-repo codegen re-run.

## Output format

```markdown
## Forward-Engineer Report — material-requisition-approval

- Scaffold stamped: <target_dir> (first run) / already present (subsequent)
- Definition loaded: definitions/material-requisition-approval/v1.json → workflow-engine
- Data models generated: MaterialRequisition (workflow-engine/app/models.py)
- Forms wired: create_mr, review_mr
- Agent steps registered: cost_governance_draft → CostGovernanceDraftAgent
- UI page: packages/ui/src/pages/MaterialRequisition.tsx
- Parity report: parity-reports/appian.md (2 items flagged NEEDS_REVIEW)
```
