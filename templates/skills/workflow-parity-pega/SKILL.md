---
name: workflow-parity-pega
description: RapidX Pega parity skill — construct-by-construct mapping from Pega to the workflow platform scaffold, for comprehension, blueprint, and forward-engineering agents.
origin: RapidX
---

# Skill: Workflow Parity — Pega

## Purpose

STATUS: Stub, not yet validated against a real export. This mapping is a
best-effort first pass from Pega's public documentation and platform
concepts, not mined from an actual Pega-to-custom-platform migration the way
`workflow-parity-appian` was. Treat every row as a hypothesis to confirm
against the real ruleset export during Comprehend, not an established fact.

Gives `workflow-logic-extractor`, `workflow-forms-generator`,
`workflow-data-modeler`, and `workflow-topology-architect` a starting
construct-level mapping so Pega source material has a consistent first
translation instead of being extracted ad hoc.

## When to use

- `source_platform: pega` on any process being comprehended, reimagined,
  blueprinted, or forward-engineered.
- Always cross-check against the actual ruleset/`.rap` export during
  Comprehend — Pega's class-inheritance rule model means the same case type
  can be assembled very differently across implementations.

## Capability parity table

Fidelity: **Full** (feature-complete equivalent in the scaffold), **Extended**
(scaffold exceeds Pega's capability), **Partial** (manual completion
needed), **Roadmap** (architecturally supported, not yet in the scaffold).
Every row below additionally carries **(unvalidated)** since this table has
not yet been checked against a real export.

| Pega Construct | Target Equivalent | Layer | Fidelity | Notes |
|---|---|---|---|---|
| Case Type | Workflow Definition (`graph_json`) | workflow-engine | Full (unvalidated) | Case stages/steps flatten to the 9 node types |
| Stage / Process (flow) | Sequence of nodes within the definition | workflow-engine | Full (unvalidated) | Pega stages don't map 1:1 to a single node type — usually a subgraph |
| Assignment (human task) | `task` node + task-service inbox | task-service | Full (unvalidated) | Role/worklist routing → task-service assignment rules |
| Harness / Section (UI) | `form_schema` + schema-driven form component | UI + task-service | Partial (unvalidated) | Pega layout groups/repeating layouts need manual form-schema authoring |
| Decision Table / Decision Tree | `logic` node (Python expression) | workflow-engine | Extended (unvalidated) | Decision tables become explicit, version-controlled Python, not opaque rule rows |
| Data Transform | Python utility function in `{{platform_slug}}_shared` | py-shared | Full (unvalidated) | |
| Data Page | Cached query function / read model in owning service | per-service | Partial (unvalidated) | Pega's declarative data-page caching has no direct scaffold equivalent — needs explicit caching code |
| Class (data model rule) | SQLAlchemy model + Pydantic schema | owning service | Partial (unvalidated) | Pega class inheritance must be flattened/composed explicitly — no inheritance primitive in the scaffold's data layer |
| Connector (Integration rule, REST/SOAP) | `integration` node with templated body + httpx call | workflow-engine | Full (unvalidated) | |
| Activity (legacy procedural rule) | Python function or `logic` node, case by case | workflow-engine / py-shared | Partial (unvalidated) | Activities often encode arbitrary procedural logic — requires careful manual review, not mechanical translation |
| Access Group / Role | Roles array on User model; RBAC in identity | identity | Full (unvalidated) | |
| Service Level Agreement (SLA) | `timer` node + escalation task | workflow-engine + task-service | Extended (unvalidated) | Explicit timer/escalation node rather than a background SLA engine |
| Correspondence / Notification rule | In-app real-time notification (SSE/pub-sub) | task-service | Partial (unvalidated) | Email/print correspondence adapters are a roadmap item |
| Report Definition | Reports page with filterable tables | UI | Extended (unvalidated) | |
| Agent (Pega background agent) | Scheduled job / background worker | infra | Partial (unvalidated) | No direct visual editor equivalent yet — implemented as a plain background task |
| Pega RPA / Robotic Automation | `integration` node + `agent_step` node | workflow-engine | Extended (unvalidated) | LLM-driven agents can replace rule-based RPA in many cases |
| Case audit history (pxHistory) | Audit Core: hash-chained append-only event log | audit-core | Extended (unvalidated) | |
| Pega Constellation UI | React SPA shell (`AppShell.tsx`) + router | UI | Full (unvalidated) | |

## Using this table

- `workflow-logic-extractor`: use the Case Type / Assignment / Decision /
  Connector / Activity rows to classify each extracted step; flag any
  Activity with non-trivial procedural logic as `NEEDS_CLARIFICATION`
  rather than guessing its behavior from the rule name alone.
- `workflow-forms-generator`: Pega Harness/Section layouts do not map
  mechanically — always confirm field list and layout against the actual
  export, not this table alone.
- `workflow-data-modeler`: Pega class inheritance needs an explicit
  flattening decision per class hierarchy; record that decision rather than
  silently picking one.
- Anything marked **Partial** must be flagged in the parity report
  (`parity-reports/pega.md`) produced by `workflow-forward-engineer`.

## Anti-patterns to avoid

- Treating any row in this table as validated fact — it is a starting
  hypothesis until confirmed against a real Pega export.
- Mechanically translating a Pega Activity's procedural steps without
  understanding what it actually does — Activities can contain arbitrary
  Java/procedural logic that a construct-name match will not reveal.
- Assuming Pega's declarative data-page caching, SLA engine, or class
  inheritance have free equivalents in the scaffold — each needs an explicit
  design decision recorded during Blueprint, not an implicit one.
