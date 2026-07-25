---
name: workflow-parity-appian
description: RapidX Appian parity skill — construct-by-construct mapping from Appian to the workflow platform scaffold, for comprehension, blueprint, and forward-engineering agents.
origin: RapidX
---

# Skill: Workflow Parity — Appian

## Purpose

STATUS: Validated — mined from a real Appian-to-custom-platform migration
engagement (manufacturing governance domain) and generalized. This is the
deepest of the platform parity skills; Pega/BAW/MuleSoft parity skills are
thinner stubs by comparison (see `workflow-parity-pega`,
`workflow-parity-baw`, `workflow-parity-mulesoft`).

Gives `workflow-logic-extractor`, `workflow-forms-generator`,
`workflow-data-modeler`, and `workflow-topology-architect` a construct-level
mapping table so Appian source material is translated consistently instead
of ad-hoc per engagement.

## When to use

- `source_platform: appian` on any process being comprehended, reimagined,
  blueprinted, or forward-engineered.

## Capability parity table

Fidelity: **Full** (feature-complete equivalent in the scaffold), **Extended**
(scaffold exceeds Appian's capability), **Partial** (manual completion
needed), **Roadmap** (architecturally supported, not yet in the scaffold).

| Appian Construct | Target Equivalent | Layer | Fidelity | Notes |
|---|---|---|---|---|
| Process Model | Workflow Definition (`graph_json` + SpiffWorkflow BPMN 2.0) | workflow-engine | Full | 9 node types; visual designer |
| Process Task / Attended Task | Task Service + task inbox | task-service | Full | Role-filtered queue, claim/complete, schema-driven form render |
| SAIL Interface / Form | JSON Schema `form_schema` + schema-driven form component | UI + task-service | Full | Field types: text, number, boolean, date, dropdown, textarea |
| Record Type | SQLAlchemy model + Pydantic schema + FastAPI router | owning service | Full | One endpoint set per entity |
| Report / Grid | Reports page with filterable tables | UI | Extended | Live data from APIs |
| Tempo Dashboard / Site Page | Dashboard page: KPI cards, activity feed | UI | Extended | Role-aware |
| Appian Site | React SPA shell (`AppShell.tsx`) + router | UI | Full | Role-based nav |
| Action (Start Process) | `POST /v1/instances` with initial context | workflow-engine | Full | Context seeded into first task |
| XOR Gateway / Decision | `gateway` node (signal-based) + `logic` node (Python expression) | workflow-engine | Extended | `logic` evaluates arbitrary Python condition |
| Smart Service (AI) | `agent_step` node → agent-service | agent-service | Extended | See `workflow-agentic-topology-patterns` |
| Connected System + Integration | `integration` node with templated body + httpx call | workflow-engine | Full | Endpoint/method/headers/body configurable |
| Document Store / Folders | Object storage adapter (local/MinIO/Azure Blob per scaffold config) | storage adapter | Full — dev; Roadmap — prod object store | Scaffold ships local-disk adapter by default |
| Expression Rule | Python utility function in `{{platform_slug}}_shared` | py-shared | Full | Testable, version-controlled |
| Appian Constant | `pydantic-settings` env var per service | per-service | Full | Type-safe, environment-overridable |
| Appian Data Type (CDT) | Pydantic v2 model (`schemas.py`) | per-service | Full | Field-level validators |
| Appian Group | Roles array on User model; RBAC in identity | identity | Full | Extensible role list |
| Appian Security Model | JWT + RBAC (+ Vault/mTLS/OPA at production hardening) | identity + infra | Full — dev; Extended — prod hardened | Scaffold ships JWT+RBAC; zero-trust mesh is a deployment-time upgrade, not scaffold-default |
| Tempo Mobile | Responsive React UI | UI | Partial | Native/PWA is a roadmap item, not scaffold-default |
| Web API Object | FastAPI router with OpenAPI auto-docs | per-service | Extended | Automatic validation + JWT middleware |
| Appian Plug-in | Shared py-shared library + service middleware | py-shared | Full | Shared-lib pattern replaces plug-in registry |
| Process Report | Audit Core query endpoint | audit-core | Extended | Hash-chained, tamper-evident |
| Send Email / Alert Smart Service | In-app real-time notification (SSE/pub-sub) | task-service | Partial | Email adapter is a roadmap item |
| Appian Portal (public forms) | Public route with anonymous JWT scope | UI + identity | Roadmap | Architecture supports it, not yet implemented |
| Query Rule | Async SQLAlchemy queries + client-side query caching | per-service + UI | Full | Server-side filtering/pagination/sorting |
| e-Signature Smart Service | `esign` node → esign service | esign | Extended | Re-auth + meaning statement + document hash |
| Appian Audit Logs | Audit Core: hash-chained append-only event log | audit-core | Extended | Cryptographically tamper-evident |
| Deployed vs Published process versions | `WorkflowDefinition.version` + deactivate-on-publish | workflow-engine | Full | Running instances use their snapshot version |
| Appian RPA | `integration` node + `agent_step` node | workflow-engine | Extended | LLM-driven agents can replace rule-based RPA scripts |
| Record with Data Sync | Direct async SQL — no proprietary sync layer | per-service | Full | |
| Tempo Quick Action | Dashboard action card | UI | Full | One-click workflow start |
| AppMarket Package | Agent pipeline library (Agent Builder) | agent-service | Extended | Visual pipeline editor, shareable |
| Appian Designer | Workflow Designer (visual BPMN editor) + Agent Builder | UI | Extended | Both visual editors ship in the scaffold |

## Using this table

- `workflow-logic-extractor`: use the node-type rows (Process Model / Task /
  Gateway / Smart Service / Connected System / Timer / Subprocess) to classify
  each extracted step.
- `workflow-forms-generator`: use the SAIL field-type mapping — TextField→
  string, IntegerField→integer, DateField→string+date format, DropdownField→
  string+enum, CheckboxField→boolean, FileUploadField→string+uri (upload
  hook), ParagraphField→string+multiline.
- `workflow-data-modeler`: use the Record Type / CDT / field-type rows.
- Anything marked **Partial** or **Roadmap** must be flagged in the parity
  report (`parity-reports/appian.md`) produced by `workflow-forward-engineer`
  — never silently treated as fully migrated.

## Anti-patterns to avoid

- Treating a **Partial**/**Roadmap** row as done because "something similar
  exists" — the parity report must call out the gap explicitly.
- Re-deriving this mapping table per engagement instead of reusing it.
- Assuming production-hardened infra (Postgres, object storage, service
  mesh) ships by default — the scaffold's dev-mode defaults (SQLite, local
  disk) are a deliberate starting point, upgraded at deployment time, not
  during forward-engineering.
