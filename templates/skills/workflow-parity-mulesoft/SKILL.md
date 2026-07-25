---
name: workflow-parity-mulesoft
description: RapidX MuleSoft parity skill — construct-by-construct mapping from MuleSoft to the workflow platform scaffold, for comprehension, blueprint, and forward-engineering agents.
origin: RapidX
---

# Skill: Workflow Parity — MuleSoft

## Purpose

STATUS: Stub, not yet validated against a real export. This mapping is a
best-effort first pass from MuleSoft's public documentation, not mined from
an actual MuleSoft-to-custom-platform migration the way
`workflow-parity-appian` was. Treat every row as a hypothesis to confirm
during Comprehend, not an established fact.

MuleSoft is an integration platform, not a case/workflow-management
platform like the other three — most MuleSoft source material maps to
`integration` nodes and shared library code rather than to human-task or
form constructs. Expect MuleSoft engagements to look more like "integration
consolidation" than "process migration."

## When to use

- `source_platform: mulesoft` on any process being comprehended, reimagined,
  blueprinted, or forward-engineered.
- Especially relevant when a MuleSoft flow is a dependency of an Appian/
  Pega/BAW process being migrated (a Connected System/Service Task calling
  out to a Mule application) — check `dependency-graph.json` for
  `unresolved_integrations` pointing at Mule endpoints before assuming a
  process's integration surface is fully captured.

## Capability parity table

Fidelity: **Full** (feature-complete equivalent in the scaffold), **Extended**
(scaffold exceeds MuleSoft's capability), **Partial** (manual completion
needed), **Roadmap** (architecturally supported, not yet in the scaffold).
Every row below additionally carries **(unvalidated)** since this table has
not yet been checked against a real export.

| MuleSoft Construct | Target Equivalent | Layer | Fidelity | Notes |
|---|---|---|---|---|
| Mule Flow | `integration` node (if simple pass-through) or a small dedicated FastAPI service (if it has non-trivial logic) | workflow-engine / new service | Partial (unvalidated) | Decide per-flow during Blueprint whether it collapses to a node or needs its own service |
| Mule Sub-Flow | Python function in `{{platform_slug}}_shared` | py-shared | Full (unvalidated) | |
| HTTP Listener (inbound endpoint) | FastAPI router endpoint | owning service | Full (unvalidated) | |
| HTTP Requester / Connector (outbound call) | `integration` node with templated body + httpx call, or direct service-to-service call | workflow-engine / per-service | Full (unvalidated) | |
| DataWeave Transform (DWL) | Python transform function in `{{platform_slug}}_shared` | py-shared | Full (unvalidated) | DataWeave's declarative mapping syntax must be re-expressed as explicit Python — not a mechanical line-for-line port |
| Choice Router | `gateway` node or plain Python `if`/`match` | workflow-engine / py-shared | Full (unvalidated) | |
| Batch Job / Scatter-Gather | Background worker / async task fan-out | infra / per-service | Partial (unvalidated) | No visual batch-job editor equivalent yet; implemented as plain async code |
| Anypoint MQ / VM Queue | Message queue integration (adapter TBD per target infra) | infra | Roadmap (unvalidated) | Scaffold does not ship a message-queue adapter by default |
| Object Store (Mule) | Cache layer or SQLite/Postgres table, per use case | per-service | Partial (unvalidated) | No generic key-value cache ships by default; decide per use case |
| API Specification (RAML/OAS) | FastAPI's auto-generated OpenAPI spec | per-service | Extended (unvalidated) | Target services get OpenAPI docs "for free" instead of hand-maintained RAML |
| Mule Domain Project (shared config) | `{{platform_slug}}_shared` py-shared library + `.env` config | py-shared / per-service | Full (unvalidated) | |
| Error Handling Strategy | Python exception handling + Audit Core error logging | per-service + audit-core | Extended (unvalidated) | Structured, queryable error audit trail rather than flow-local error handlers |
| CloudHub Worker / Deployment | Container service in `docker-compose.yml` / target infra manifests | infra | Full (unvalidated) | |
| API Manager Policies (rate limiting, auth) | API gateway / nginx config + identity JWT middleware | infra + identity | Partial (unvalidated) | Policy-by-policy translation needed; no 1:1 policy engine equivalent yet |

## Using this table

- `workflow-logic-extractor` / `workflow-dependency-mapper`: MuleSoft flows
  frequently appear as *dependencies* of another platform's process
  (a Connected System or Service Task calling into Mule), not as a
  standalone process — trace these into `dependency-graph.json` as
  cross-system edges, and don't extract them as independent processes
  unless they truly stand alone.
- DataWeave transforms need re-authoring as explicit Python, not a
  syntax-level port — confirm the actual transform semantics, especially
  around null handling and type coercion, which DataWeave handles
  implicitly.
- Anything marked **Partial** or **Roadmap** must be flagged in the parity
  report (`parity-reports/mulesoft.md`) produced by
  `workflow-forward-engineer`.

## Anti-patterns to avoid

- Migrating a Mule flow as a standalone "process" when it is actually a
  shared integration dependency of a case/workflow process — check the
  dependency graph first.
- Line-for-line transliterating DataWeave syntax into Python without
  verifying the transform's actual null-handling and type-coercion
  behavior, which DataWeave often handles implicitly.
- Assuming a message-queue or generic cache adapter exists in the scaffold
  by default — both are Roadmap/Partial and need an explicit infra decision
  at Blueprint.
