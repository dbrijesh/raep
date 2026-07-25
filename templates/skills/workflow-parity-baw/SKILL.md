---
name: workflow-parity-baw
description: RapidX IBM BAW (Business Automation Workflow) parity skill — construct-by-construct mapping from BAW to the workflow platform scaffold, for comprehension, blueprint, and forward-engineering agents.
origin: RapidX
---

# Skill: Workflow Parity — IBM BAW

## Purpose

STATUS: Stub, not yet validated against a real export. This mapping is a
best-effort first pass from IBM BAW's public documentation and its native
BPMN 2.0/DMN foundation, not mined from an actual BAW-to-custom-platform
migration the way `workflow-parity-appian` was. Treat every row as a
hypothesis to confirm during Comprehend, not an established fact.

BAW is expected to be the **highest-fidelity** of the three stub platforms
to migrate, since both it and the target scaffold's workflow-engine are
native BPMN 2.0/DMN — the source and target share a standard, rather than
requiring translation from a proprietary rule model (contrast with Pega's
rule-based model or Appian's low-code SAIL model).

## When to use

- `source_platform: baw` on any process being comprehended, reimagined,
  blueprinted, or forward-engineered.
- Always cross-check against the actual BPMN/DMN XML export during
  Comprehend — this table assumes standard BPMN 2.0 constructs; confirm no
  IBM-specific extensions are in play before assuming a clean 1:1 mapping.

## Capability parity table

Fidelity: **Full** (feature-complete equivalent in the scaffold), **Extended**
(scaffold exceeds BAW's capability), **Partial** (manual completion
needed), **Roadmap** (architecturally supported, not yet in the scaffold).
Every row below additionally carries **(unvalidated)** since this table has
not yet been checked against a real export.

| BAW / BPMN 2.0 Construct | Target Equivalent | Layer | Fidelity | Notes |
|---|---|---|---|---|
| Process Application (BPD) | Workflow Definition (`graph_json` + SpiffWorkflow BPMN 2.0) | workflow-engine | Full (unvalidated) | Both sides are BPMN 2.0 — direct import is architecturally the closest of the three stub platforms |
| Start Event | `start` node | workflow-engine | Full (unvalidated) | |
| End Event | `end` node | workflow-engine | Full (unvalidated) | |
| User Task | `task` node + task-service inbox | task-service | Full (unvalidated) | Lane/role assignment → task-service assignment rules |
| Coach (UI panel) | `form_schema` + schema-driven form component | UI + task-service | Partial (unvalidated) | Coach views' nested UI binding needs manual form-schema authoring |
| Exclusive/Inclusive/Parallel Gateway | `gateway` node | workflow-engine | Full (unvalidated) | Parallel-gateway join semantics should be verified against SpiffWorkflow's BPMN support during Blueprint |
| Intermediate/Boundary Timer Event | `timer` node | workflow-engine | Full (unvalidated) | |
| Business Rule Task (DMN decision) | `logic` node evaluating a translated DMN decision table | workflow-engine | Extended (unvalidated) | DMN is a standard — translation is more mechanical than Pega's decision tables |
| Service Task | `integration` node with templated body + httpx call | workflow-engine | Full (unvalidated) | |
| Script Task | Python function in `{{platform_slug}}_shared` or `logic` node | py-shared / workflow-engine | Full (unvalidated) | |
| Business Object (BAW data model) | Pydantic v2 model (`schemas.py`) | per-service | Full (unvalidated) | |
| Exposed Business Object (data persistence) | SQLAlchemy model | owning service | Full (unvalidated) | |
| Team / Role | Roles array on User model; RBAC in identity | identity | Full (unvalidated) | |
| Sub-Process (call activity) | Nested workflow definition invoked from a parent | workflow-engine | Partial (unvalidated) | Scaffold's node model favors flat graphs; nested sub-process invocation needs an explicit pattern decision at Blueprint |
| Process Instance tracking / BPM REST API | Workflow-engine instance API (`POST /v1/instances`, etc.) | workflow-engine | Full (unvalidated) | |
| IBM Business Automation Insights (process audit) | Audit Core: hash-chained append-only event log | audit-core | Extended (unvalidated) | |
| Process Portal (default UI) | React SPA shell (`AppShell.tsx`) + router | UI | Full (unvalidated) | |
| Content Integration (ECM attachments) | Object storage adapter (local/MinIO/Azure Blob) | storage adapter | Full — dev; Roadmap — prod object store (unvalidated) | |

## Using this table

- `workflow-logic-extractor`: BAW's native BPMN/DMN XML should parse more
  directly into the 9 node types than either Pega or Appian source
  material — but still confirm no vendor-specific BPMN extensions are used
  before assuming a clean match.
- `workflow-forms-generator`: Coach view field bindings need to be traced
  through their nested UI binding structure; do not assume a flat field
  list without checking.
- `workflow-data-modeler`: use the Business Object / Exposed Business
  Object rows directly — BAW's data model is already close to the target
  shape.
- Anything marked **Partial** must be flagged in the parity report
  (`parity-reports/baw.md`) produced by `workflow-forward-engineer`.

## Anti-patterns to avoid

- Assuming "both are BPMN 2.0" means zero translation work — lane
  assignment, Coach view binding, and sub-process invocation still need
  explicit decisions.
- Treating this table as validated fact — confirm every row against the
  real BPMN/DMN export before relying on it for Blueprint decisions.
- Silently flattening a call-activity sub-process into the parent graph
  without recording that as a design decision.
