# Skill: Invariant Checks

**Applies to**: All platforms (Claude Code, Cursor, Antigravity, Copilot, Codex, OpenCode)
**Category**: Governance & Quality
**Always installed**: Yes

## What this skill does

Gives RapidX a project-specific **invariant catalog** — a set of deterministic
rules that must hold true across the codebase — and enforces them automatically
on **every execute phase**. Invariants encode the non-negotiables a team would
otherwise rely on memory or review to catch: architectural boundaries, security
mandates, coding standards, and testing requirements.

## Why this matters

Generic AI assistants forget your rules between turns. RapidX invariants are
machine-checked on every file edit, so a boundary violation or a hardcoded
secret is caught the moment it is written — regardless of which platform the
developer is on. The same `catalog.json` drives identical enforcement
everywhere.

## How it works

```
/rapidx:invariant-catalog   →  Q&A interview  →  .rapidx/invariants/catalog.json
            │
            ▼
  invariant-check hook (PostToolUse: Write|Edit|MultiEdit)
            │   runs on every file change during the execute phase
            ▼
   error → blocks & asks the agent to fix
   warn  → surfaces on stderr (default)
   info  → logged to .rapidx/audit.jsonl

/rapidx:invariant-check     →  full-repo scan (also runs `command` invariants, CI gate)
```

## The catalog

Lives at `.rapidx/invariants/catalog.json`. Authored by the
`invariant-catalog` agent, never hand-maintained from scratch. Each invariant:

| Field | Meaning |
|-------|---------|
| `id` | Stable identifier (`INV-001`) |
| `name` | Short human label |
| `category` | `architecture` \| `security` \| `standards` \| `testing` \| `operational` |
| `severity` | `error` (blocks) \| `warn` (default) \| `info` (log only) |
| `rationale` | Why it exists — the team's own words |
| `appliesTo` / `excludes` | Glob scopes (`**`, `*`, `?`, `{a,b}`) |
| `check` | The executable rule (see below) |
| `message` | Remediation guidance shown on failure |

### Check types

| `check.type` | Fails when… |
|--------------|-------------|
| `must_match` | a scoped file lacks `pattern` |
| `must_not_match` | a scoped file contains `pattern` |
| `pair` | `when` matches but `require` does not |
| `path_exists` | no file matches the required glob |
| `path_absent` | a forbidden glob matches |
| `command` | the shell `command` exits non-zero (full scan only) |

## Engine

`.rapidx/hooks/lib/invariants.cjs` — zero-dependency (Node built-ins only).
Exposes `loadCatalog`, `evaluate({ scopeFiles })`, `renderFailures`. The hook
scopes to the changed file; the command evaluates the whole repo.

## Commands

| Command | What it does |
|---------|-------------|
| `/rapidx:invariant-catalog` | Create/extend the catalog via guided Q&A |
| `/rapidx:invariant-catalog --extend` | Add to an existing catalog |
| `/rapidx:invariant-catalog --from-knowledge` | Propose invariants from learned knowledge |
| `/rapidx:invariant-check` | Full-repo scan, grouped by severity |
| `/rapidx:invariant-check --ci` | Non-zero exit on error-severity failures |

## Agents

- `invariant-catalog` — authors the catalog from interview + learned context

## Hooks

- `invariant-check` — PostToolUse on Write/Edit/MultiEdit; enforces the catalog
  on every change. No-op when no catalog exists, so it is always safe to install.

## Relationship to learning

The `invariant-catalog` agent seeds proposals from `.rapidx/knowledge/`
(anti-patterns, guidelines, the codebase knowledge graph) and `.rapidx/inputs/`
(mandates, security artifacts). Run `/rapidx:learn` and `/rapidx:knowledge-graph`
first to get higher-quality invariant suggestions.
