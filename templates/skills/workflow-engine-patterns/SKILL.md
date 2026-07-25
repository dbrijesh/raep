---
name: workflow-engine-patterns
description: RapidX workflow engine patterns skill — the BPMN/SpiffWorkflow engine, node vocabulary, and per-service persistence patterns used by the workflow platform scaffold.
origin: RapidX
---

# Skill: Workflow Engine Patterns

## Purpose

Documents the architecture of the scaffold stamped by
`--stamp-workflow-scaffold` (`templates/workflow-platform-scaffold/`), so
agents generating workload-specific code (`workflow-forward-engineer`) and
architects designing target processes (`workflow-blueprint-architect`) target
it correctly instead of inventing a new pattern per engagement.

## When to use

- Designing or generating any workflow definition, service model, or
  agent_step pipeline for a `workflow-modernization` engagement.

## Service topology

Seven services, each with its own SQLite (swap to a real RDBMS for
production via `DB_URL`), fronted by an nginx gateway:

| Service | Responsibility |
|---|---|
| `audit-core` | Hash-chained, append-only audit log every other service writes to |
| `identity` | Auth (pluggable adapter: `stub` for local, `azure_ad` for prod) |
| `esign` | Electronic signatures — meaning statement + signer + hash, chained to audit-core |
| `workflow-engine` | BPMN/Spiff process definitions + running instances |
| `task-service` | Human task queue, SLA tracking, form binding |
| `agent-service` | Agentic AI pipelines — traced, replayable LLM-backed steps |
| `llm-gateway` | Single point of LLM access (adapters: mock/ollama/vllm/azure_openai); redacts sensitive fields before logging |

Every service-to-service call is an HTTP call to another service's URL — never
a direct DB join across services. Cross-service references are IDs, resolved
by calling the owning service.

## The 9-node workflow vocabulary

Every process definition (`graph_json`) is built from these node types, which
`bpmn_converter.py` converts to BPMN 2.0 XML for the SpiffWorkflow executor:

| Type | Meaning |
|---|---|
| `start` / `end` | Process boundaries |
| `task` | Human task, bound to a form and a role |
| `gateway` | Conditional branch |
| `timer` | SLA/delay |
| `agent_step` | Agentic AI step, dispatched to `agent-service` |
| `esign` | Electronic signature checkpoint |
| `integration` | External system call |
| `logic` | Deterministic rule evaluation, no human/AI involved |

Every node needs a stable `id` (used as `task_spec.name` after BPMN
conversion — round-tripping depends on this id never changing once a process
version is live).

## JSON-in-SQLite persistence pattern

Structured fields (e.g. a task's form data, a workflow instance's variable
bag) are stored as a JSON column, validated on read/write via a Pydantic
model with a `field_validator` that (de)serializes the JSON — not as
individual relational columns. This keeps the schema stable across
process-definition changes (a new form field doesn't require a migration).
API responses that wrap this JSON payload use a `_payload` key internally,
unwrapped in the Pydantic response schema before it reaches the API
contract — don't leak `_payload` into generated API responses.

## Agent Pipeline Editor (agent_step design)

`agent_step` nodes are configured as a pipeline of typed steps, editable via
the target UI's Agent Pipeline Editor:

`ap_input → prompt → llm → extract → condition → output`

- `ap_input`: binds workflow variables into pipeline scope
- `prompt`: templated prompt construction
- `llm`: call to `llm-gateway` (never call an LLM provider directly)
- `extract`: structured extraction from the LLM response
- `condition`: branch within the pipeline (distinct from a workflow `gateway`)
- `output`: writes result back into workflow variables

Every agent invocation is traced (`agent-service`'s `AgentTrace` model) —
input hash, prompt summary, token counts, duration — and replayable by
`replay_trace_id`, so agentic steps are auditable exactly like human steps.

## Anti-patterns to avoid

- Cross-service DB joins — always go through the owning service's API.
- Calling an LLM provider directly from a workflow service instead of through
  `llm-gateway` — breaks redaction and tracing.
- Changing a live process definition's node `id`s instead of versioning
  (`definitions/<slug>/v2.json`).
- Storing form data as ad-hoc relational columns instead of the validated
  JSON pattern.
