---
name: rapidx:help
description: Show all RapidX Agentic Engineering Platform commands
---

<objective>
Display the complete RapidX command reference including all available commands, their purposes, and usage examples.
</objective>

<output>
# RapidX Agentic Engineering Platform — Command Reference

## Execution modes — choose your autonomy level

| Mode | Command | Autonomy | Description |
|------|---------|----------|-------------|
| **Mode 1** | `/rapidx:do <task>` | Dispatcher | Routes your request to the best command automatically |
| **Mode 2** | `/rapidx:do-mode2 <task>` | Human-driven | You approve every gate — plan, each sub-task diff, final commit |
| **Mode 3** | `/rapidx:do-mode3 <task>` | Orchestrated | Agents run parallel waves, you review at each wave boundary |
| **Mode 4** | `/rapidx:do-mode4 <task>` | Autonomous | Full autopilot — plans, executes, verifies, commits without checkpoints |

**Which mode should I use?**
- New feature in sensitive codebase → **Mode 2** (full control)
- Large refactor with clear parallelizable work → **Mode 3** (speed + oversight)
- Trusted task in well-tested codebase → **Mode 4** (maximum speed)
- Not sure what command to run → **Mode 1** (smart dispatcher)

For VS Code Copilot: `/rapidx-do-mode2`, `/rapidx-do-mode3`, `/rapidx-do-mode4`

---

## RapidX workflow commands (/rapidx:* aliases)

| Command | Description |
|---------|-------------|
| `/rapidx:new-project` | Initialize a new project with requirements and roadmap |
| `/rapidx:plan-phase` | Plan the next development phase |
| `/rapidx:execute-phase` | Execute current phase with parallel tasks |
| `/rapidx:verify-work` | Verify completed work against requirements |
| `/rapidx:review` | Code review current changes |
| `/rapidx:ship` | Prepare and execute release |
| `/rapidx:quick` | Quick ad-hoc task or bug fix |
| `/rapidx:map-codebase` | Analyze existing codebase for migration |
| `/rapidx:health` | Check project health status |
| `/rapidx:help` | Show full workflow command reference |

## Spec-Driven Development commands

| Command | Description |
|---------|-------------|
| `/rapidx:spec [feature]` | Create a feature specification (SDD) |
| `/rapidx:spec-review [id]` | Review spec for completeness and compliance |
| `/rapidx:plan-spec [id]` | Generate implementation plan from spec |
| `/rapidx:tasks-from-spec [id]` | Convert plan to GTD executable tasks |
| `/rapidx:constitution` | View, create, or amend project constitution |
| `/rapidx:constitution create` | Create the project constitution |
| `/rapidx:constitution check` | Check current diff against constitution |
| `/rapidx:adr new [title]` | Create an Architecture Decision Record |
| `/rapidx:adr list` | List all ADRs with status |
| `/rapidx:adr check` | Check current diff against accepted ADRs |

## Codebase Learning commands

| Command | Description |
|---------|-------------|
| `/rapidx:learn` | Learn patterns from codebase (code + guidelines) |
| `/rapidx:learn --docs` | Learn from documentation only |
| `/rapidx:learn --arch` | Focus on architecture artifacts |
| `/rapidx:learn --file <path>` | Learn from a specific file |
| `/rapidx:learn --dir <path>` | Learn from a directory (e.g., .rapidx/inputs/) |
| `/rapidx:learn-arch` | Deep architecture analysis (ADRs, diagrams) |
| `/rapidx:fine-tune` | Apply learned knowledge to all platform configs |
| `/rapidx:fine-tune --preview` | Preview changes without applying |
| `/rapidx:knowledge-sync` | Push knowledge to all installed platforms |

## Plugin management commands

| Command | Description |
|---------|-------------|
| `/rapidx:plugin list` | Show all available plugins |
| `/rapidx:plugin install <name>` | Install a plugin bundle |
| `/rapidx:plugin remove <name>` | Remove an installed plugin |
| `/rapidx:plugin info <name>` | Show plugin details |

## Enterprise / governance commands

| Command | Description |
|---------|-------------|
| `/rapidx:help` | Show this command reference |
| `/rapidx:init-client` | Initialize or switch client profile |
| `/rapidx:switch-client` | Switch active client profile |
| `/rapidx:add-tech` | Add a technology to the current stack |
| `/rapidx:governance-check` | Run governance and compliance audit |
| `/rapidx:maturity-gate` | Check maturity gate status and requirements |
| `/rapidx:audit-report` | Generate audit trail report |
| `/rapidx:onboard-codebase` | Onboard an existing codebase to RapidX |
| `/rapidx:health` | Check RapidX installation health |

## Cross-platform equivalents

All RapidX commands work across AI coding platforms:

| Claude Code | VS Code Copilot | Cursor | Codex |
|-------------|-----------------|--------|-------|
| `/rapidx:spec` | `@spec-writer [feature]` | Ask: "Create spec for..." | `codex spec [feature]` |
| `/rapidx:learn` | `@knowledge-curator learn` | Ask: "Learn from codebase" | `codex learn` |
| `/rapidx:execute-phase` | `@workflow-orchestrator execute` | Ask: "Execute current phase" | `codex execute phase` |
| `/rapidx:review` | `@code-reviewer review` | Ask: "Review my changes" | `codex review` |

## Complete SDLC workflow (quick reference)

```bash
# 1. Onboard existing codebase (first time)
/rapidx:onboard-codebase

# 2. Learn from codebase
/rapidx:learn --all

# 3. Create project constitution
/rapidx:constitution create

# 4. Start a new feature (Spec-Driven Development)
/rapidx:spec "user authentication with JWT"

# 5. Review the spec
/rapidx:spec-review 001-user-authentication

# 6. Generate implementation plan
/rapidx:plan-spec 001-user-authentication

# 7. Create GTD tasks
/rapidx:tasks-from-spec 001-user-authentication

# 8. Execute tasks
/rapidx:execute-phase

# 9. Verify against spec
/rapidx:verify-work

# 10. Review code
/rapidx:review

# 11. Ship
/rapidx:ship

# 12. Update knowledge (after new patterns introduced)
/rapidx:learn --code
/rapidx:knowledge-sync
```

## Available plugins

```bash
/rapidx:plugin list        # See all plugins
/rapidx:plugin install sdd-workflow         # Spec-Driven Development bundle
/rapidx:plugin install knowledge-engine     # Codebase learning bundle
/rapidx:plugin install enterprise-governance  # Governance + compliance bundle
/rapidx:plugin install github-actions-sdlc    # CI/CD workflow bundle
/rapidx:plugin install full-sdlc             # Everything
```

## Current configuration

Run `/rapidx:health` to see current profile, tech stack, and installed components.
</output>
