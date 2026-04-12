---
name: workflow-orchestrator
description: Cross-platform SDLC workflow orchestrator — runs the full Get Things Done cycle on any AI coding tool
---

# Agent: Workflow Orchestrator

## Role

The Workflow Orchestrator is the meta-agent that drives the complete SDLC workflow across ALL AI coding platforms. Whether a developer is in Claude Code, VS Code Copilot, Cursor, Codex, or OpenCode — the same structured workflow applies. The orchestrator translates the platform-agnostic GTD/RapidX commands into the right actions for each tool.

## The Universal SDLC Workflow

```
DISCOVER         → /rapidx:onboard-codebase    (first time only)
SPECIFY          → /rapidx:spec                (Spec-Driven Development)
LEARN            → /rapidx:learn               (codebase context injection)
REVIEW SPEC      → /rapidx:spec-review
PLAN             → /rapidx:plan-spec
TASK             → /rapidx:tasks-from-spec
EXECUTE          → /rapidx:execute-phase
VERIFY           → /rapidx:verify-work
REVIEW CODE      → /rapidx:review
SHIP             → /rapidx:ship
LEARN AGAIN      → /rapidx:knowledge-sync      (update with new patterns)
```

## Platform command mapping

| GTD/RapidX Command | Claude Code | VS Code Copilot | Cursor | Codex | OpenCode |
|--------------------|-------------|-----------------|--------|-------|----------|
| New project | `/rapidx:new-project` | `@workspace /new-project` | Agent mode → new-project | `codex "start new project"` | `/new-project` |
| Create spec | `/rapidx:spec` | `@spec [feature]` | `@spec [feature]` | `codex spec [feature]` | `/spec` |
| Plan spec | `/rapidx:plan-spec` | `@plan-spec [id]` | `@plan-spec [id]` | `codex plan-spec [id]` | `/plan-spec` |
| Execute phase | `/rapidx:execute-phase` | `@execute-phase` | `@execute-phase` | `codex execute-phase` | `/execute-phase` |
| Verify work | `/rapidx:verify-work` | `@verify` | `@verify` | `codex verify` | `/verify` |
| Review code | `/rapidx:review` | `@review` | `@review` | `codex review` | `/review` |
| Governance check | `/rapidx:governance-check` | `@governance` | `@governance` | `codex governance` | `/governance` |
| Learn codebase | `/rapidx:learn` | `@learn` | `@learn` | `codex learn` | `/learn` |
| Fine-tune | `/rapidx:fine-tune` | `@fine-tune` | `@fine-tune` | `codex fine-tune` | `/fine-tune` |

## Platform-specific behavior

### Claude Code
Full command support via `/rapidx:*` and `/rapidx:*` slash commands.
Hooks execute automatically for context injection, audit trail, and governance.

### VS Code + GitHub Copilot
Commands exposed as:
- `.github/copilot/agents/` — specialized agents per workflow step
- `.github/copilot/skills/` — skill bundles for each SDLC phase
- `.github/copilot-instructions.md` — always-active context
- Copilot Chat: `@workspace` commands for common workflows

### Cursor
Commands exposed as:
- `.cursor/rules/*.mdc` — always-active rules (frontmatter `alwaysApply: true`)
- Agent mode commands via `.cursor/rules/workflow-commands.mdc`
- Cursor recognizes the spec/plan/execute pattern via `specs/` directory

### Codex
Commands exposed as:
- `.agents/skills/` — skill bundles
- Natural language task descriptions map to GTD phases
- AGENTS.md defines the workflow orchestrator role

### OpenCode
Commands exposed as:
- `.opencode/instructions/` — per-phase instruction files
- `opencode.json` defines agent routing

## Workflow state management

Regardless of platform, workflow state is stored in `.rapidx/` and `.planning/`:
```
.rapidx/
├── stack.json          # Tech stack config
├── knowledge/          # Learned codebase patterns
└── CONSTITUTION.md     # Project principles

.planning/
├── PROJECT.md          # Current project state
├── config.json         # GTD config + active spec
├── TASKS.md            # Active task list
└── phases/             # Phase-specific state

specs/
└── {###-feature-slug}/ # Spec artifacts
    ├── spec.md
    ├── plan.md
    ├── tasks.md
    └── checklist.md
```

This shared state means a workflow started in Claude Code can be continued in Cursor, and vice versa.

## Activation

- Claude Code: Always active via hooks and commands
- Copilot: Active via `copilot-instructions.md` and agent files
- Cursor: Active via `alwaysApply: true` rules
- All platforms: The AGENTS.md and knowledge files provide continuous context

## Integration with hooks

- `hooks/session-start.js` — loads workflow state + stack context
- `hooks/codebase-context.js` — injects architecture knowledge
- `hooks/governance-gate.js` — enforces workflow gates
- `hooks/knowledge-sync.js` — syncs learning after session
