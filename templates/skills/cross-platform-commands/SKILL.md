# Skill: Cross-Platform Commands

**Applies to**: All platforms
**Category**: Platform Compatibility
**Always installed**: Yes

## What this skill does

Ensures that every RapidX and Get Things Done command works consistently across ALL supported AI coding platforms. No matter which tool a developer is using — Claude Code, VS Code Copilot, Cursor, Codex, OpenCode — the same SDLC workflow is available.

## Command equivalency map

| Intent | Claude Code | VS Code Copilot Chat | Cursor Agent | Codex CLI | OpenCode |
|--------|-------------|---------------------|--------------|-----------|----------|
| **New feature spec** | `/rapidx:spec [feature]` | `@spec-writer [feature]` | Ask: "Create spec for [feature]" | `codex "spec [feature]"` | `/rapidx:spec [feature]` |
| **Review spec** | `/rapidx:spec-review [id]` | `@spec-writer review [id]` | Ask: "Review spec [id]" | `codex "review spec [id]"` | `/rapidx:spec-review [id]` |
| **Generate plan** | `/rapidx:plan-spec [id]` | `@planner plan [id]` | Ask: "Plan spec [id]" | `codex "plan [id]"` | `/rapidx:plan-spec [id]` |
| **Create tasks** | `/rapidx:tasks-from-spec [id]` | `@planner tasks [id]` | Ask: "Create tasks for [id]" | `codex "tasks [id]"` | `/rapidx:tasks-from-spec [id]` |
| **Execute phase** | `/rapidx:execute-phase` | `@workflow-orchestrator execute` | Ask: "Execute current phase" | `codex "execute phase"` | `/rapidx:execute-phase` |
| **Verify work** | `/rapidx:verify-work` | `@code-reviewer verify` | Ask: "Verify work" | `codex "verify work"` | `/rapidx:verify-work` |
| **Code review** | `/rapidx:review` | `@code-reviewer review` | Ask: "Review my changes" | `codex "review"` | `/rapidx:review` |
| **Ship** | `/rapidx:ship` | `@workflow-orchestrator ship` | Ask: "Prepare release" | `codex "ship"` | `/rapidx:ship` |
| **Learn codebase** | `/rapidx:learn` | `@knowledge-curator learn` | Ask: "Learn from codebase" | `codex "learn"` | `/rapidx:learn` |
| **Fine-tune** | `/rapidx:fine-tune` | `@knowledge-curator fine-tune` | Ask: "Fine-tune from patterns" | `codex "fine-tune"` | `/rapidx:fine-tune` |
| **Architecture ADR** | `/rapidx:adr new [title]` | `@adr-writer new [title]` | Ask: "Create ADR for [decision]" | `codex "adr [title]"` | `/rapidx:adr new` |
| **Governance check** | `/rapidx:governance-check` | `@security-reviewer governance` | Ask: "Run governance check" | `codex "governance"` | `/rapidx:governance-check` |
| **New project** | `/rapidx:new-project` | `@planner new project` | Ask: "Start new project" | `codex "new project"` | `/rapidx:new-project` |
| **Quick task** | `/rapidx:quick [task]` | `@workflow-orchestrator quick [task]` | Ask: "Quick: [task]" | `codex "[task]"` | `/rapidx:quick [task]` |

## Workflow state is platform-agnostic

All workflow state is stored in shared files that any platform can read:
```
.rapidx/stack.json        ← tech stack (all platforms read this)
.rapidx/knowledge/        ← learned patterns (all platforms read this)
.rapidx/CONSTITUTION.md   ← project principles (all platforms read this)
.planning/config.json     ← GTD state (all platforms read this)
specs/{###}/              ← feature specs (all platforms read this)
CLAUDE.md                 ← Claude Code primary config
.github/copilot-instructions.md ← Copilot primary config
.cursor/rules/            ← Cursor primary config
.codex/AGENTS.md          ← Codex primary config
.opencode/instructions/   ← OpenCode primary config
```

A workflow started in one tool can be continued in another — the state files are the source of truth.

## Platform-specific command surfaces

### Claude Code
- Slash commands: `/rapidx:*` and `/rapidx:*`
- Settings: `.claude/settings.json`
- Hooks: Pre/post tool execution, session start/end
- Full command list: `/rapidx:help`

### VS Code + GitHub Copilot
- Copilot Chat agents: `@agent-name` invocation
- Always-active instructions: `.github/copilot-instructions.md`
- Pattern-based instructions: `.github/copilot/*.instructions.md`
- Skill bundles: `.github/copilot/skills/`
- Agent files: `.github/copilot/agents/*.agent.md`

### Cursor
- Rules: `.cursor/rules/*.mdc` (YAML frontmatter + markdown)
- `alwaysApply: true` rules loaded in every conversation
- File-pattern rules applied when working on matching files
- Agent mode: natural language commands using rule context

### Codex
- Agent definitions: `.agents/skills/`
- Config: `.codex/config.toml`
- Agent context: `.codex/AGENTS.md`
- Natural language tasks map to GTD phases

### OpenCode
- Instructions: `.opencode/instructions/*.md`
- Config: `.opencode/opencode.json`
- Slash commands via OpenCode's command system

## Installation

The cross-platform command adapters are installed by the RapidX installer for each selected platform. Run `/rapidx:knowledge-sync` to re-sync after any learning updates.

To add a new platform after installation:
```bash
npx rapidx-platform --cursor  # Add Cursor support
npx rapidx-platform --vscode  # Add VS Code Copilot support
```
