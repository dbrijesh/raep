# Workflow Platform Scaffold

This directory is a production-architecture template for a modernized workflow application:
a BPMN/SpiffWorkflow engine, task/audit/e-sign/identity services, an LLM gateway + agent-service
for the agentic layer, and a React UI (design system, drag-and-drop workflow editor, admin console).

It was extracted from `AppianDemo/mgp` — a hand-built reference implementation (Hexaware's
Manufacturing Governance Platform, built as an Appian-migration demo) — generalized so it can be
stamped out for any workflow-modernization target, not just manufacturing governance.

It is stamped into a target project by `stampWorkflowScaffold()`
(`rapidx-platform/src/generate-workflow-scaffold.js`), invoked via
`node bin/install.js --stamp-workflow-scaffold --target <dir> --platform-name "..." --platform-slug ...`.
Stamping copies this tree and replaces every token below with the values supplied at stamp time.

## Token vocabulary

| Token | Meaning | Example |
|---|---|---|
| `{{PLATFORM_NAME}}` | Human-readable product name | `Acme Claims Platform` |
| `{{platform_slug}}` | Lowercase identifier (docker network, py-shared package, npm scope, minio bucket prefix) | `acme-claims` |
| `{{PLATFORM_SLUG_UPPER}}` | Uppercase identifier (env var prefixes, brand mark, BPMN process id) | `ACME_CLAIMS` |
| `{{platform_docker_network}}` | Docker network name (currently aliased to `{{platform_slug}}` in docker-compose.yml) | `acme-claims` |
| `{{platform_seed_email_domain}}` | Email domain for seeded demo users | `acmeclaims.local` |
| `{{PLATFORM_BASE_AGENT_CLASS}}` | Base agent class name in `agent-service/app/agents/base.py` | `BaseAcmeClaimsAgent` |

Substitution is plain string replacement (no regex/brace parsing), applied across every file's
contents. This is why some templated lines look like triple-brace nesting — e.g.
`{{PLATFORM_SLUG_UPPER}}_ENV: ${{{PLATFORM_SLUG_UPPER}}_ENV:-local}` in `docker-compose.yml` —
that's a docker-compose `${VAR:-default}` reference where `VAR` itself is a token; once
`{{PLATFORM_SLUG_UPPER}}` is replaced with `ACME_CLAIMS`, it resolves to the perfectly valid
`ACME_CLAIMS_ENV: ${ACME_CLAIMS_ENV:-local}`.

## The A/B/C convention

Every file in this scaffold falls into one of three categories (see `SCAFFOLD_MANIFEST.json`
for the exact list):

- **A — generic, copied as-is** (token-substituted only): the workflow engine, task service,
  audit core, e-sign, identity, llm-gateway, the shared Python lib, and all UI infrastructure
  (design system, WorkflowEditor, login/dashboard/tasks/workflows pages, admin console). This is
  the bulk of the scaffold and needs no further editing to run.
- **B — generic mechanics, stub content**: files whose *code* is generic but whose *data* was
  workload-specific in the source, e.g. `workflow-engine/app/seed.py` (seeds one minimal example
  approval workflow instead of the source manufacturing processes) and `agent-service/app/service.py`
  (empty `AGENT_REGISTRY`, TODO-marked). Look for `TODO({{PLATFORM_NAME}})` comments.
- **C — workload-specific, excluded entirely**: the manufacturing-domain agents
  (deviation triage, RCA drafting, CAPA suggestion, batch anomaly, cert review, DB-query agent)
  and their UI pages (Certificates, Deviations, Reports, Material Requisition, DB Query Agent).
  These are never part of the generic scaffold — `workflow-forward-engineer` generates their
  replacements per the engagement's blueprint, landing them in the placeholder directories left
  behind (`services/agent-service/app/agents/README.md`,
  `packages/ui/src/pages/.gitkeep`).

## What you get after stamping

A `docker-compose.yml`-orchestrated set of FastAPI services (SQLite by default, swappable to
Postgres/MSSQL via `DB_URL`), a SpiffWorkflow-backed BPMN executor that accepts a JSON graph format
(start/task/gateway/timer/agent_step/esign/integration/logic nodes) and converts it to BPMN XML
internally, an audit-core service with hash-chained audit events, an e-sign service, a stub or
Azure AD identity provider, an LLM gateway (ollama/vllm/azure_openai adapters) fronting an
agent-service with a pluggable `AGENT_REGISTRY`, and a React admin console with a drag-and-drop
workflow designer and agent pipeline builder. Everything is TODO-marked where workload-specific
content (your actual processes, forms, and agents) needs to be added — which is exactly what
`workflow-forward-engineer` automates from the engagement's blueprint.
