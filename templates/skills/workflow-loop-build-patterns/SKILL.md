---
name: workflow-loop-build-patterns
description: RapidX loop build patterns skill — how to build fresh, greenfield code for a `/rapidx:loop` autonomous engagement using the target architecture as reference only, never as copied scaffold
origin: RapidX
---

# Skill: Workflow Loop Build Patterns

## Purpose

`workflow-engine-patterns`, `workflow-compliance-patterns`, and
`workflow-agentic-topology-patterns` document the target architecture that
`--stamp-workflow-scaffold` literally stamps out for the gated
Comprehend→Reimagine→Blueprint→Forward-Engineer pipeline. `/rapidx:loop`
uses the exact same target architecture, but arrives at it differently:
every file is generated fresh, phase by phase, with no scaffold stamped and
no code copied. This skill states that distinction explicitly so
`loop-architecture-planner` and `loop-phase-builder` don't default to
treating the scaffold or any reference implementation as a starting point.

## When to use

- Any `/rapidx:loop` engagement, from architecture planning through every
  build phase.

## The two hard rules

1. **Reference, never copy.** `templates/workflow-platform-scaffold/`,
   `reference-implementation/` (if present in the repo), and any MGP-derived
   source exist solely so agents know what the target architecture *looks
   like* — service topology, the 9-node workflow vocabulary, the 6-step
   agent pipeline shape, the JSON-in-SQLite persistence pattern, the
   hash-chained audit trail. Read them for pattern guidance. Never copy a
   file, directory, or non-trivial code block from them into build output.
   Every line `loop-phase-builder` produces is written fresh against the
   pattern, tailored to the frozen spec for this specific engagement.

2. **Cross-cutting capabilities are independent services from day one.**
   Audit, identity, e-sign, agent-gateway/agent-service, notifications,
   reporting — whichever ones the frozen spec calls for — are each their own
   deployable service with an explicit API contract, exposed as a sidecar or
   plain API call. They are never embedded as shared library code duplicated
   into other services. This is designed in Phase 1 of the build plan, not
   retrofitted later. Apply `workflow-engine-patterns`' existing rule — no
   cross-service DB joins, always call the owning service's API — to every
   cross-cutting capability without exception.

## What to actually reuse from the pattern skills

- **Node vocabulary and BPMN/Spiff shape** — `workflow-engine-patterns`'
  9-node vocabulary (`start`/`end`/`task`/`gateway`/`timer`/`agent_step`/
  `esign`/`integration`/`logic`) and its graph_json → BPMN XML conversion
  rules.
- **Agent Pipeline shape** — the 6-step `ap_input → prompt → llm → extract →
  condition → output` pipeline for every `agent_step`, always routed through
  a dedicated `llm-gateway` service, never calling an LLM provider directly.
- **Persistence pattern** — structured fields as a validated JSON column,
  not ad-hoc relational columns, so a new form field never requires a
  migration.
- **Compliance patterns** — from `workflow-compliance-patterns`: e-signature
  requirements (re-authentication, declared meaning/reason, hash + timestamp
  + signer identity), and the append-only hash-chained audit trail every
  other service writes to via the audit service's API.

## Progress Dashboard Protocol

`/rapidx:loop` auto-launches a local live dashboard (`.rapidx/loop/dashboard/`
— a zero-dependency Node `http` server, no external npm packages, per this
project's coding standards) the instant the command starts, so both
technical and non-technical stakeholders can watch the build happen in real
time instead of reading raw logs. All three loop agents
(`loop-requirements-clarifier`, `loop-architecture-planner`,
`loop-phase-builder`) feed it by **appending** one JSON line per meaningful
step to `.rapidx/loop/progress.jsonl` — never rewrite or truncate this file,
only append.

Each line is a single-line JSON object:

```json
{"ts":"2026-07-24T16:32:10.482Z","loop_stage":"implementation","stage":"phase_build","phase_id":2,"phase_name":"Workflow Engine + Core Domain","status":"in_progress","level":"info","message":"Building the workflow engine service...","detail":"Writing services/workflow-engine/app/main.py, models.py, spiff_executor.py"}
```

Fields:
- `ts` — ISO timestamp.
- `loop_stage` — **which of the three loops this event belongs to**, always one of `intent` | `implementation` | `verification`. This is what lets the dashboard show the user which of the three loops (create intent → implement → verify) is currently running, independent of the finer-grained `stage` below. Mapping: `intake`/`clarify`/`architecture` → `intent`; the "Implement" part of a phase → `implementation`; the "Self-verify"/retry part of a phase → `verification`. `complete` and `escalation` stages set `loop_stage` to `complete`/`escalation` respectively.
- `stage` — one of `intake` | `clarify` | `architecture` | `phase_build` | `verification` | `escalation` | `complete`.
- `phase_id` / `phase_name` — the current phase's id/name from `plan.md`/`manifest.json`; `null` outside phase_build/verification stages.
- `status` — one of `started` | `in_progress` | `verified` | `blocked` | `retrying` | `done`.
- `level` — one of `info` | `success` | `warning` | `error` — drives the dashboard's color coding.
- `message` — a short **plain-language** sentence a non-technical stakeholder can follow (e.g. "Building the workflow engine service…", not "Compiling spiff_executor.py").
- `detail` — optional, technical detail for engineers (file paths, commands run, error text). Omit the field entirely rather than leaving it empty.

**Emission cadence is not optional and "meaningful milestones only" is too
sparse** — a dashboard that only updates a few times per phase reads as
broken to whoever is watching it. During implementation and verification,
append one line **before or after every individual `Write`/`Edit`/`Bash`
tool call that does real work** (one file written = one event; one command
run = one event), not just once per phase. Over-emitting is the correct
default; under-emitting is the bug. The feed must never go quiet for more
than a few seconds while work is actually happening.

`.rapidx/loop/manifest.json` still drives the dashboard's phase timeline and
percentage-complete ring, so keep both in sync — update `manifest.json`'s
phase status at the same moment you append the corresponding
`phase_complete`/`blocked` progress event, not before or after.

### Machine-readable architecture for the dashboard

Alongside the human-readable `.rapidx/loop/architecture.md`,
`loop-architecture-planner` also writes `.rapidx/loop/architecture.json`:

```json
{
  "services": [
    { "name": "audit-core", "type": "Cross-cutting (sidecar)", "responsibility": "Append-only, hash-chained audit log", "api": "POST /events, GET /events?filter=" }
  ]
}
```

The dashboard reads this file directly for its "Target Architecture" panel
instead of trying to regex-parse the markdown table — the JSON file is the
one that must always be written and kept in sync with `architecture.md`;
treat a missing or stale `architecture.json` as a bug, not a cosmetic gap.

### Token usage on the dashboard

`.rapidx/loop/tokens.json` powers the dashboard's "Tokens Used" counter. It
is written by the `token-tracker` hook (`.rapidx/hooks/token-tracker.js`),
not by any agent — the hook tails the Claude Code session transcript
(`transcript_path` from its `PostToolUse` hook input) after every tool call
and accumulates real `usage` figures, bucketed by `.rapidx/loop/manifest.json`'s
`current_phase` at the time of each call:

```json
{
  "updated_at": "2026-07-24T16:32:10.482Z",
  "current_phase": 2,
  "total": { "input": 128400, "output": 41200, "cache_read": 610000, "cache_creation": 92000, "sum": 871600 },
  "by_phase": { "0": { "input": 12000, "output": 4100, "cache_read": 40000, "cache_creation": 8000, "sum": 64100 } }
}
```

No agent needs to emit this data itself — it's derived mechanically from
the session transcript, which is the only place real token counts exist.
Agents should not attempt to estimate or self-report token usage in
`progress.jsonl`; that would just duplicate (and likely disagree with) what
`token-tracker` already computes from source.

## Anti-patterns to avoid

- Copying any file from `templates/workflow-platform-scaffold/` or
  `reference-implementation/` into build output, even as a "starting point
  to customize."
- Implementing a cross-cutting capability as an imported shared module
  instead of a standalone service with its own API.
- Treating the target architecture as fixed regardless of the frozen spec —
  `loop-architecture-planner` tailors service boundaries to what the spec's
  "Clarified Decisions" actually call for; it doesn't stamp every service in
  the reference topology unconditionally.
- Skipping a phase's self-verification step to move faster — every phase
  must pass verification (or exhaust retries and escalate) before the next
  phase starts.
