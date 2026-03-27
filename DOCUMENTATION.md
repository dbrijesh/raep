# RapidX Agentic Engineering Platform — Documentation

**Version:** 1.0.0
**License:** MIT
**Package:** `rapidx-platform`

---

## Table of Contents

1. [What is RapidX Agentic Engineering Platform?](#1-what-is-rapidx-agentic-engineering-platform)
2. [Architecture Overview](#2-architecture-overview)
3. [Underlying Open Source Components](#3-underlying-open-source-components)
4. [Capabilities](#4-capabilities)
5. [Supported Platforms & IDEs](#5-supported-platforms--ides)
6. [Interactive Installer](#6-interactive-installer)
7. [Tech Stack Support](#7-tech-stack-support)
8. [Client Profiles](#8-client-profiles)
9. [Command Reference](#9-command-reference)
10. [Agent Catalog](#10-agent-catalog)
11. [Skill Catalog](#11-skill-catalog)
12. [Hooks & Governance](#12-hooks--governance)
13. [Component Mapping — How Installation Stays Lean](#13-component-mapping--how-installation-stays-lean)
14. [Configuration Files](#14-configuration-files)
15. [Installation Instructions](#15-installation-instructions)
16. [Non-Interactive / CI Mode](#16-non-interactive--ci-mode)
17. [Adding Technologies Later](#17-adding-technologies-later)
18. [Directory Structure](#18-directory-structure)
19. [Running Tests](#19-running-tests)

---

## 1. What is RapidX Agentic Engineering Platform?

RapidX Agentic Engineering Platform is a **unified, enterprise-grade agentic SDLC orchestration framework** that brings together three layers:

| Layer | Source | Role |
|-------|--------|------|
| **Get Things Done** (GTD) | Open source workflow engine | SDLC lifecycle: plan → build → review → test → ship |
| **Everything Claude Code** (ECC) | Open source component library | Coding standards, agents, skills, security rules, hooks |
| **RapidX enterprise layer** | New code (this repo) | Interactive installer, client profiles, governance gates, compliance packs, multi-platform config generation |

**The core problem it solves:** Enterprise engineering teams use multiple AI coding tools (Claude Code, Cursor, VS Code + Copilot, Codex) and switch between clients with different tech stacks, coding standards, and compliance requirements. RapidX installs the right context for each tool automatically — and only installs the skills and rules relevant to your actual stack. A React + TypeScript + PostgreSQL project gets ~18 skills. Not all 48.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    RapidX Enterprise Layer                       │
│  Interactive installer · Client profiles · Governance gates      │
│  Compliance packs · Maturity model · Multi-platform generators   │
└────────────────────┬────────────────────┬────────────────────────┘
                     │                    │
          ┌──────────▼──────────┐   ┌────▼──────────────────────┐
          │   Get Things Done   │   │  Everything Claude Code   │
          │  (GTD workflow      │   │  (ECC component library)  │
          │   engine)           │   │                           │
          │                     │   │  Skills · Rules · Agents  │
          │  plan → build →     │   │  Hooks · Security         │
          │  review → test →    │   │  Multi-runtime configs    │
          │  ship               │   │                           │
          └──────────┬──────────┘   └────┬──────────────────────┘
                     │                   │
          ┌──────────▼───────────────────▼──────────────────────┐
          │              AI Coding Tools                         │
          │  Claude Code · VS Code+Copilot · Cursor · Codex     │
          │  OpenCode · Gemini CLI · Copilot CLI · Antigravity  │
          └─────────────────────────────────────────────────────┘
```

### Key design decisions

- **Selective installation:** Component mapping is data-driven (`src/component-map.json`). Only stack-relevant components are installed — never inject irrelevant context.
- **Version-specific guidance:** Generated `CLAUDE.md` and `copilot-instructions.md` include explicit constraints like "Use React 18.3.1. Do NOT use features from newer versions."
- **Settings merging:** VS Code `settings.json` is always read → merged → written back. Existing keys are never overwritten.
- **Zero npm dependencies:** The entire installer runs on Node.js built-ins only (`fs`, `path`, `os`, `child_process`, `readline`, `crypto`).
- **Single source of truth:** `.rapidx/stack.json` records the installed tech stack. All generators, updaters, and profile loaders read from it.

---

## 3. Underlying Open Source Components

### Get Things Done (GTD) — Workflow Engine

| | |
|-|-|
| **Upstream repo** | https://github.com/gsd-build/get-shit-done |
| **License** | MIT |
| **Vendored at** | `get-things-done/` |
| **Version pinned** | v1.26.0+ |

GTD provides the structured SDLC workflow that RapidX builds on. It introduces:

- **Phase-based lifecycle:** `discuss → plan → execute → verify → ship`
- **Fresh subagent contexts:** Every plan spawns a new 200K-token subagent context to prevent context rot
- **Wave-based parallel execution:** Tasks run in dependency-ordered waves
- **XML-structured task plans:** Machine-readable plans with built-in verification steps
- **Atomic git commits:** One commit per task with clean history
- **State management:** `.planning/` directory stores project state between sessions
- **Brownfield support:** `map-codebase` command analyzes legacy codebases for migration
- **Quick mode:** Ad-hoc tasks, bug fixes, and hotfixes without full phase overhead

RapidX modifications to GTD:
- Planner agent prompt extended to load client-specific rules filtered by tech stack
- Executor subagent prompt extended to load stack-relevant ECC agents per task type
- `new-project` flow extended with profile and tech stack awareness
- All user-facing help text updated to say "Get Things Done" (the internal brand name)

### Everything Claude Code (ECC) — Component Library

| | |
|-|-|
| **Upstream repo** | https://github.com/affaan-m/everything-claude-code |
| **License** | MIT |
| **Sourced from** | `everything-claude-code-main/` |
| **Version pinned** | v1.8.0+ |

ECC provides the enterprise component library that RapidX uses as its skill and agent inventory:

- **Skills:** Reusable prompt modules (coding-standards, tdd-workflow, security-review, frontend-patterns, etc.)
- **Rules:** Language and framework coding standards injected into agent context
- **Agents:** Specialized subagents for planning, reviewing, testing, debugging
- **Hooks:** Event-driven scripts that fire on tool use (audit trail, secret scanning, session management)
- **Multi-runtime configs:** OpenAI agent YAML, platform-specific adapters

RapidX uses ECC as a content library — the installer selects the relevant subset and copies it into place for each configured platform.

---

## 4. Capabilities

### 4.1 Interactive installer with environment detection

The installer scans your machine and project before asking a single question:

- Detects Claude Code, VS Code + Copilot extensions, Cursor, Codex, OpenCode, Gemini CLI, JetBrains, GitHub Copilot CLI, Antigravity
- Scans 15+ project file types for version auto-detection (package.json, go.mod, pyproject.toml, docker-compose.yml, GitHub Actions workflows, etc.)
- Pre-fills version fields — user just hits Enter to confirm
- Shows exactly what will be installed and what will be skipped before writing anything

### 4.2 Selective component installation

The component mapping engine (`src/map-components.js` + `src/component-map.json`) ensures:

- Only skills, rules, and agents relevant to your tech stack are installed
- A React + TypeScript + PostgreSQL project: ~18–20 skills
- A Java + Spring Boot project: different set including Spring-specific skills
- A pure Go service: Go patterns, Go testing, Go reviewers — no frontend/Django/Rails bloat
- "Always installed" baseline: 6 core skills, 7 core agents, 4 hooks — everything else is conditional

### 4.3 Multi-platform configuration

One installer run configures all your tools simultaneously:

| Platform | What gets configured |
|----------|---------------------|
| Claude Code | `/rapidx:*` commands, `/gsd:*` commands, settings.json hooks, CLAUDE.md, COMMANDS.md |
| VS Code + Copilot | copilot-instructions.md, settings.json merge, extensions.json, `.github/copilot/agents/rapidx-*.md`, `.github/copilot/prompts/rapidx/*.prompt.md` |
| Cursor | Rules with YAML frontmatter, skills, hooks, mcp.json, `.cursor/agents/rapidx-*.md`, `.cursor/commands/rapidx/*.md` |
| Codex | config.toml, AGENTS.md, skill files |
| OpenCode | opencode.json, instruction files |
| GitHub Copilot CLI | instructions.md, skill reference files |
| Gemini CLI | config.json, context files |
| Antigravity | config.json |

### 4.4 Version-specific AI guidance

Every generated config file includes a version constraints section:

```
## Version-specific guidance
- TypeScript 5.4.5: Use features available up to this version
- React 18.3.1: Use APIs and patterns from this version
- PostgreSQL 16.2: Use features available in this version
- Do NOT suggest features from versions newer than specified above
```

This prevents AI agents from suggesting React 19 APIs, TypeScript 5.5+ features, or PostgreSQL 17 syntax in a project pinned to older versions.

### 4.5 Client profile system

Six built-in profiles cover the most common enterprise delivery contexts, from startup to regulated industries. Profiles control:

- Which governance gates are mandatory
- Audit trail settings
- Maturity level (L0–L4 autonomy ladder)
- Compliance framework associations
- Review gate requirements

### 4.6 Maturity model — L0 to L4

RapidX implements a five-level AI autonomy maturity model:

| Level | Name | Human approval required | Parallel execution |
|-------|------|------------------------|--------------------|
| L0 | Traditional | All phases | No |
| L1 | Assisted | Plan and ship | No |
| L2 | Augmented | Ship only | Yes (up to 3) |
| L3 | Orchestrated | Milestone only | Yes (up to 8) |
| L4 | Autonomous | None | Yes (up to 15) |

Teams start at L1 or L2 and progress as trust and tooling mature.

### 4.7 Governance hooks

Four hooks run automatically during every Claude Code session:

- **`audit-trail`** — Logs every tool use (Read, Write, Bash, etc.) to `.rapidx/audit/` in JSONL format
- **`secret-scanner`** — Blocks writes containing AWS keys, API tokens, private keys, hardcoded passwords before they reach disk
- **`session-start`** — Loads active profile and tech stack, generates `.rapidx/active-context.md`
- **`session-end`** — Summarizes session activity

### 4.8 Add-tech — incremental stack expansion

```bash
node bin/install.js --add-tech
# or in Claude Code:
/rapidx:add-tech
```

Re-runs the tech stack questionnaire for a new category only, computes the delta of components not already installed, installs only the new ones, and updates all generated config files. No reinstall required.

---

## 5. Supported Platforms & IDEs

| Platform | Detection method | Config written |
|----------|-----------------|---------------|
| **Claude Code CLI** | `claude --version` | `.claude/commands/rapidx/` (53 `/rapidx:*` aliases), `.claude/commands/gsd/` (53 originals), `.claude/settings.json`, `CLAUDE.md`, `COMMANDS.md` |
| **VS Code + GitHub Copilot** | `code --version` + `code --list-extensions` | `.github/copilot-instructions.md`, `.vscode/settings.json`, `.vscode/extensions.json`, `.github/copilot/agents/rapidx-*.md` (10 agents), `.github/copilot/prompts/rapidx/*.prompt.md` (53 prompt files), `.github/copilot/skills/` |
| **Cursor IDE** | App path detection + `.cursor/` dir | `.cursor/rules/`, `.cursor/skills/`, `.cursor/agents/rapidx-*.md` (10 agents), `.cursor/commands/rapidx/` (53 MDC files), `.cursor/mcp.json` |
| **GitHub Copilot CLI** | `gh copilot --version` | `.github/copilot/instructions.md`, `.github/copilot/skills/` |
| **Codex CLI/App** | `codex --version` | `.codex/config.toml`, `.codex/AGENTS.md`, `.agents/skills/` |
| **OpenCode** | `opencode --version` | `.opencode/opencode.json`, `.opencode/instructions/` |
| **Gemini CLI** | `gemini --version` | `.gemini/config.json` |
| **Antigravity** | `.agent/` dir or `antigravity --version` | `.agent/config.json` |
| **JetBrains IDEs** | `.idea/` dir | Detected and reported (configuration planned) |

---

## 6. Interactive Installer

### Launch

```bash
# From your project directory
node /path/to/rapidx-platform/bin/install.js

# Or if globally linked
rapidx
```

### Installer flow — 8 steps

**Step 1 — Welcome & environment scan**

```
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   RapidX Agentic Engineering Platform                        ║
║   Enterprise-grade SDLC orchestration                        ║
║                                                              ║
║   Powered by Get Things Done + Everything Claude Code        ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

Scanning your development environment...

  AI coding tools:
    ✓ Claude Code CLI        v2.3.1
    ✗ Codex CLI              not found

  IDEs & editors:
    ✓ VS Code                v1.96.2  (Copilot ✓, Copilot Chat ✓)
    ✓ Cursor IDE             v0.48.1
```

**Step 2 — Platform selection** (detected tools pre-selected, arrow keys + space to toggle)

**Step 3 — Tech stack questionnaire** (versions auto-filled from project files, Enter to confirm)

**Step 4 — Installation scope** (global `~/` or local `./` or both)

**Step 5 — Client profile selection** (6 built-in profiles)

**Step 6 — Installation plan** (shows exact components to install + what will be skipped)

**Step 7 — Installation execution** (progress bar with per-step status)

**Step 8 — Post-install summary and quick-start guide**

---

## 7. Tech Stack Support

### Frontend frameworks

| Framework | Auto-detected from | Skills installed |
|-----------|-------------------|-----------------|
| React | `package.json` dependencies | `frontend-patterns`, `e2e-testing` |
| Next.js | `package.json` | `frontend-patterns`, `e2e-testing` |
| Angular | `package.json` | `frontend-patterns`, `e2e-testing` |
| Vue.js / Nuxt | `package.json` | `frontend-patterns`, `e2e-testing` |
| Svelte / SvelteKit | `package.json` | `frontend-patterns`, `e2e-testing` |
| React Native | `package.json` | `frontend-patterns` |
| Flutter | (project scan) | `frontend-patterns` |
| iOS Swift | (project scan) | `swift-actor-persistence`, `swift-protocol-di-testing`, `liquid-glass-design`, `foundation-models-on-device` |

### Backend languages & frameworks

| Stack | Auto-detected from | Skills installed |
|-------|--------------------|-----------------|
| TypeScript / Node.js | `package.json`, `tsconfig.json` | `typescript` rules |
| Express | `package.json` | `backend-patterns`, `api-design` |
| NestJS | `package.json` | `backend-patterns`, `api-design` |
| Fastify | `package.json` | `backend-patterns`, `api-design` |
| Python / FastAPI | `requirements.txt`, `pyproject.toml` | `backend-patterns`, `api-design`, `python-patterns`, `python-testing` |
| Python / Django | `requirements.txt`, `Pipfile` | `backend-patterns`, `api-design`, `django-patterns`, `django-security`, `django-tdd`, `django-verification` |
| Python / Flask | `requirements.txt` | `backend-patterns`, `api-design`, `python-patterns`, `python-testing` |
| Java / Spring Boot | `pom.xml`, `build.gradle` | `backend-patterns`, `api-design`, `springboot-patterns`, `springboot-security`, `springboot-tdd`, `springboot-verification`, `java-coding-standards`, `jpa-patterns` |
| Go | `go.mod` | `backend-patterns`, `api-design`, `golang-patterns`, `golang-testing` |
| PHP / Laravel | `composer.json` | `backend-patterns`, `api-design`, `laravel-patterns`, `laravel-security`, `laravel-tdd`, `laravel-verification` |
| Rust | `Cargo.toml` | `backend-patterns`, `api-design` |
| C# / .NET | (project scan) | `backend-patterns`, `api-design` |
| C++ | (project scan) | `cpp-coding-standards`, `cpp-testing` |
| Perl | (project scan) | `perl-patterns`, `perl-security`, `perl-testing` |

### Databases

| Database | Skills installed |
|----------|-----------------|
| PostgreSQL | `postgres-patterns`, `database-migrations` |
| MySQL / MariaDB | `database-migrations` |
| MongoDB | `database-migrations` |
| DynamoDB | `database-migrations` |
| SQL Server | `database-migrations` |
| SQLite | `database-migrations` |

All databases also trigger the `database-reviewer` agent.

### Infrastructure

| Technology | Skills installed |
|------------|-----------------|
| Docker | `docker-patterns`, `deployment-patterns` |
| Docker Compose | `docker-patterns`, `deployment-patterns` |
| Kubernetes | `deployment-patterns`, `docker-patterns` |
| Any CI/CD (GitHub Actions, GitLab CI, Jenkins, Azure DevOps) | `deployment-patterns` |

### Testing frameworks

| Framework | Auto-detected from | Skills/agents |
|-----------|--------------------|--------------|
| Playwright | `package.json` | `e2e-testing`, `e2e-runner` agent |
| Cypress | `package.json` | `e2e-testing`, `e2e-runner` agent |
| Jest | `package.json` | (core tdd-workflow covers Jest) |
| Vitest | `package.json` | (core tdd-workflow covers Vitest) |
| pytest | `requirements.txt` | `python-testing` |
| JUnit | `pom.xml` | `springboot-tdd` |
| Go testing | `go.mod` | `golang-testing` |

---

## 8. Client Profiles

Profiles are JSON files in `profiles/`. They control governance, compliance, maturity level, review gates, and which components are active.

### Built-in profiles

| Profile | Maturity | Use case |
|---------|----------|----------|
| `default` | L1 | General use — sensible defaults, no specific governance |
| `greenfield-startup` | L1 | New projects — minimal governance, maximum speed |
| `enterprise-standard` | L2 | Standard enterprise — code review, security scan, audit trail |
| `pharma-regulated` | L2 | 21 CFR Part 11 compliance — full audit, e-signatures, validation |
| `finserv-sox` | L2 | Financial services / SOX — change management, segregation of duties |
| `insurance-hipaa` | L2 | Insurance / HIPAA — PHI controls, access logging, breach notification |

### Profile schema (key fields)

```json
{
  "profile_id": "enterprise-standard",
  "engagement": {
    "type": "greenfield | modernization | maintenance | migration",
    "maturity_level": "L0 | L1 | L2 | L3 | L4"
  },
  "rules": ["common"],
  "skills": ["coding-standards", "security-review", "..."],
  "agents": ["planner", "architect", "..."],
  "hooks": ["session-start", "audit-trail", "secret-scanner"],
  "review_gates": [
    { "name": "code-review", "mandatory": true },
    { "name": "security-review", "mandatory": true }
  ],
  "governance": {
    "compliance_frameworks": ["SOX | HIPAA | 21CFR-Part11"],
    "audit_trail": true,
    "secret_scanning": true,
    "mandatory_review": true
  }
}
```

### Switching profiles

```bash
# During install
node bin/install.js --profile enterprise-standard

# After install, in Claude Code
/rapidx:switch-client
```

---

## 9. Command Reference

### Get Things Done workflow commands — `/rapidx:*`

These are the 53 SDLC workflow commands from the Get Things Done engine, available on every supported platform under the `/rapidx:*` namespace. The original `/gsd:*` names are kept as aliases in Claude Code for backward compatibility.

| Command | Description |
|---------|-------------|
| `/rapidx:new-project` | Initialize a new project — extract requirements, generate roadmap |
| `/rapidx:discuss-phase` | Discuss and refine upcoming phase with stakeholders |
| `/rapidx:plan-phase` | Generate detailed task plan for a phase |
| `/rapidx:execute-phase` | Execute current phase with wave-based parallel tasks |
| `/rapidx:verify-work` | Verify completed work against acceptance criteria |
| `/rapidx:review` | Code review current changes |
| `/rapidx:ship` | Prepare and execute release |
| `/rapidx:quick` | Quick ad-hoc task, bug fix, or hotfix |
| `/rapidx:map-codebase` | Analyze existing codebase for migration/modernization |
| `/rapidx:next` | Move to the next task in current phase |
| `/rapidx:progress` | Show current phase and task progress |
| `/rapidx:complete-milestone` | Complete current milestone and archive |
| `/rapidx:new-milestone` | Start a new milestone |
| `/rapidx:debug` | Debug a specific issue with structured analysis |
| `/rapidx:add-tests` | Add test coverage to existing code |
| `/rapidx:research-phase` | Deep research phase before planning |
| `/rapidx:validate-phase` | Validate phase completion against requirements |
| `/rapidx:audit-milestone` | Audit a completed milestone |
| `/rapidx:pause-work` | Save context and pause current session |
| `/rapidx:resume-work` | Resume from a paused session |
| `/rapidx:session-report` | Generate a session summary report |
| `/rapidx:stats` | Show project statistics |
| ... | 31 additional workflow commands (see `COMMANDS.md` for full list) |

> **Backward compatibility:** Claude Code also installs `/gsd:*` aliases for all commands (e.g. `/gsd:new-project` still works). All Copilot and Cursor formats use `/rapidx:*` names only.

### RapidX enterprise commands (`/rapidx:*`)

| Command | Description |
|---------|-------------|
| `/rapidx:help` | Show all RapidX commands with usage examples |
| `/rapidx:init-client` | Initialize client profile for this project |
| `/rapidx:switch-client` | Switch the active client profile |
| `/rapidx:add-tech` | Add a new technology to the current stack |
| `/rapidx:governance-check` | Run governance and compliance audit |
| `/rapidx:maturity-gate` | Check maturity gate status and what's needed for next level |
| `/rapidx:audit-report` | Generate a full audit trail report from JSONL logs |
| `/rapidx:onboard-codebase` | Onboard an existing legacy codebase to RapidX |
| `/rapidx:health` | Check RapidX installation health and configuration |

### How commands are delivered per platform

| Platform | Format | Location | How to invoke |
|----------|--------|----------|---------------|
| **Claude Code** | Slash commands (`.md`) | `.claude/commands/rapidx/` | `/rapidx:new-project` |
| **Claude Code** | Legacy aliases | `.claude/commands/gsd/` | `/gsd:new-project` (backward compat) |
| **VS Code + Copilot** | Prompt files (`.prompt.md`) | `.github/copilot/prompts/rapidx/` | Open file → run via Copilot Chat, or `#file:.github/copilot/prompts/rapidx/new-project.prompt.md` |
| **Cursor** | MDC files (`.md`) | `.cursor/commands/rapidx/` | `@.cursor/commands/rapidx/new-project.md` in Composer |
| **GitHub Copilot CLI** | Instructions | `.github/copilot/instructions.md` | `gh copilot suggest "/rapidx:quick fix the auth bug"` |

A `COMMANDS.md` quick-reference file is generated at the project root listing all 53 commands with per-platform usage examples.

---

## 10. Agent Catalog

Agents are specialized subagents that perform specific roles within a task. They are loaded selectively based on task type and tech stack. The 10 core Get Things Done agents are available across all supported IDEs — not just Claude Code.

### Cross-IDE agent availability

| Agent | Claude Code | VS Code + Copilot | Cursor |
|-------|-------------|-------------------|--------|
| `planner` | ✓ `.claude/agents/` | ✓ `.github/copilot/agents/rapidx-planner.md` | ✓ `.cursor/agents/rapidx-planner.md` |
| `architect` | ✓ | ✓ `rapidx-architect.md` | ✓ `rapidx-architect.md` |
| `tdd-guide` | ✓ | ✓ `rapidx-tdd-guide.md` | ✓ `rapidx-tdd-guide.md` |
| `code-reviewer` | ✓ | ✓ `rapidx-code-reviewer.md` | ✓ `rapidx-code-reviewer.md` |
| `security-reviewer` | ✓ | ✓ `rapidx-security-reviewer.md` | ✓ `rapidx-security-reviewer.md` |
| `build-error-resolver` | ✓ | ✓ `rapidx-build-error-resolver.md` | ✓ `rapidx-build-error-resolver.md` |
| `doc-updater` | ✓ | ✓ `rapidx-doc-updater.md` | ✓ `rapidx-doc-updater.md` |
| `e2e-runner` | ✓ | ✓ `rapidx-e2e-runner.md` | ✓ `rapidx-e2e-runner.md` |
| `refactor-cleaner` | ✓ | ✓ `rapidx-refactor-cleaner.md` | ✓ `rapidx-refactor-cleaner.md` |
| `database-reviewer` | ✓ | ✓ `rapidx-database-reviewer.md` | ✓ `rapidx-database-reviewer.md` |

**Invoke in Copilot Chat:**
```
#file:.github/copilot/agents/rapidx-code-reviewer.md
Review the changes in src/auth/
```

**Invoke in Cursor Composer:**
```
@.cursor/agents/rapidx-code-reviewer.md
Review the changes in src/auth/
```

### Skill injection at install time

When the installer runs, each agent file gets an `## Active skills` section appended containing only the skills that were installed for the user's tech stack. This is determined by intersecting `agent-skill-map.json` (which skills each agent can use) with `components.skills` (which skills were actually installed). The result is agent files that reference exactly the relevant context for your project — no bloat from skills you didn't install.

**Example — code-reviewer with a Go + PostgreSQL stack:**
```markdown
## Active skills

These skills were installed for your tech stack. Reference them with @ in Composer:

- @.cursor/skills/coding-standards/SKILL.md
- @.cursor/skills/security-review/SKILL.md
- @.cursor/skills/golang-patterns/SKILL.md
- @.cursor/skills/postgres-patterns/SKILL.md
```

**Agent-to-skill map** (`src/agent-skill-map.json`):

| Agent | Candidate skills (filtered to installed) |
|-------|------------------------------------------|
| `planner` | strategic-compact, coding-standards, frontend-patterns, backend-patterns, api-design |
| `architect` | architecture-copilot, coding-standards, api-design, frontend-patterns, backend-patterns, postgres-patterns, docker-patterns, deployment-patterns |
| `tdd-guide` | tdd-workflow, coding-standards, e2e-testing, verification-loop, golang-testing, python-testing, django-tdd, springboot-tdd, laravel-tdd, dotnet-tdd, cpp-testing, swift-protocol-di-testing, perl-testing |
| `code-reviewer` | coding-standards, security-review, frontend-patterns, backend-patterns, golang-patterns, python-patterns, django-patterns, springboot-patterns, laravel-patterns, dotnet-patterns, cpp-coding-standards, java-coding-standards, perl-patterns, swift-actor-persistence |
| `security-reviewer` | security-review, ai-governance, django-security, springboot-security, laravel-security, dotnet-security, perl-security, swift-concurrency-6-2 |
| `build-error-resolver` | coding-standards, verification-loop, golang-patterns, python-patterns, django-patterns, springboot-patterns, laravel-patterns, dotnet-patterns, cpp-coding-standards, java-coding-standards |
| `doc-updater` | coding-standards, api-design |
| `e2e-runner` | e2e-testing, verification-loop, frontend-patterns |
| `refactor-cleaner` | coding-standards, verification-loop, frontend-patterns, backend-patterns, golang-patterns, python-patterns, django-patterns, springboot-patterns, dotnet-patterns |
| `database-reviewer` | postgres-patterns, database-migrations, backend-patterns, jpa-patterns |

### Always-installed agents (all stacks)

| Agent | Role |
|-------|------|
| `planner` | Generates structured XML task plans for each phase |
| `architect` | Architecture review, ADR generation, design decisions |
| `tdd-guide` | Test-driven development guidance and test plan generation |
| `code-reviewer` | Code review with client mandate enforcement |
| `security-reviewer` | Security audit, vulnerability scanning, OWASP review |
| `build-error-resolver` | Diagnose and fix build failures, dependency issues |
| `doc-updater` | Keep documentation in sync with code changes |

### Stack-conditional agents

| Agent | When installed |
|-------|---------------|
| `e2e-runner` | Any frontend framework or Playwright/Cypress in testing |
| `refactor-cleaner` | Any frontend framework |
| `database-reviewer` | Any database in stack |
| `go-reviewer` | Go backend |
| `go-build-resolver` | Go backend |
| `python-reviewer` | Python backend |

### RapidX enterprise agents

| Agent | Role |
|-------|------|
| `rapidx/governance-auditor` | Governance compliance checking and reporting |
| `rapidx/migration-analyst` | Legacy codebase analysis for modernization engagements |
| `rapidx/compliance-checker` | Regulatory compliance validation (HIPAA, SOX, 21CFR) |
| `rapidx/client-onboarder` | Client profile setup and discovery questionnaire |

---

## 11. Skill Catalog

Skills are reusable prompt modules injected into agent context. 48 skills total across two categories.

### Core skills (always installed)

| Skill | Description |
|-------|-------------|
| `coding-standards` | Universal coding standards: naming, structure, error handling, comments |
| `security-review` | OWASP Top 10, input validation, authentication, secrets management |
| `tdd-workflow` | Red-green-refactor cycle, test structure, coverage strategy |
| `strategic-compact` | Context efficiency — how to communicate effectively with AI agents |
| `search-first` | Research-before-coding discipline |
| `verification-loop` | Structured verification: does code match requirements? |

### Stack-conditional skills

| Skill | Triggered by |
|-------|-------------|
| `frontend-patterns` | React, Next.js, Angular, Vue, Svelte, React Native, Flutter |
| `backend-patterns` | Any backend framework |
| `api-design` | Any backend framework or REST/GraphQL/gRPC/tRPC API style |
| `e2e-testing` | Any frontend framework, Playwright, or Cypress |
| `postgres-patterns` | PostgreSQL |
| `database-migrations` | Any database |
| `docker-patterns` | Docker or Kubernetes |
| `deployment-patterns` | Docker, Kubernetes, or any CI/CD |
| `python-patterns` | Python (FastAPI, Flask) |
| `python-testing` | Python (FastAPI, Flask) |
| `django-patterns` | Django |
| `django-security` | Django |
| `django-tdd` | Django |
| `django-verification` | Django |
| `springboot-patterns` | Java / Spring Boot |
| `springboot-security` | Java / Spring Boot |
| `springboot-tdd` | Java / Spring Boot |
| `springboot-verification` | Java / Spring Boot |
| `java-coding-standards` | Java |
| `jpa-patterns` | Java / JPA or Spring Boot |
| `golang-patterns` | Go |
| `golang-testing` | Go |
| `laravel-patterns` | PHP / Laravel |
| `laravel-security` | PHP / Laravel |
| `laravel-tdd` | PHP / Laravel |
| `laravel-verification` | PHP / Laravel |
| `swift-actor-persistence` | Swift / iOS |
| `swift-protocol-di-testing` | Swift / iOS |
| `swift-concurrency-6-2` | Swift / iOS |
| `liquid-glass-design` | iOS native (Swift) |
| `foundation-models-on-device` | iOS native (Swift) |
| `cpp-coding-standards` | C++ |
| `cpp-testing` | C++ |
| `perl-patterns` | Perl |
| `perl-security` | Perl |
| `perl-testing` | Perl |

### RapidX enterprise skills (always installed with profile)

| Skill | Description |
|-------|-------------|
| `ai-governance` | AI usage governance, responsible AI practices |
| `client-onboarding` | Client discovery and profile setup |
| `review-gates` | Review gate enforcement and workflow |
| `pod-maturity` | AI maturity model assessment and progression |
| `architecture-copilot` | Architecture guidance and decision support |
| `migration-framework` | Legacy modernization framework (installed for modernization engagements) |

---

## 12. Hooks & Governance

Hooks are Node.js scripts that run automatically on tool use events within Claude Code.

### audit-trail

**Trigger:** Every tool use event
**Action:** Appends a JSONL entry to `.rapidx/audit/{date}.jsonl`
**Format:**
```json
{"ts":"2026-03-21T10:30:00.000Z","tool":"Write","summary":"Write(src/auth.ts)","session":"abc123","env":"local"}
```
**Purpose:** Full audit trail for compliance and incident investigation.

### secret-scanner

**Trigger:** Every `Write` or `Edit` tool call
**Action:** Scans file content for credential patterns before writing
**Detects:**
- AWS Access Key IDs (`AKIA...`)
- AWS Secret Access Keys
- GitHub personal access tokens (`ghp_...`)
- RSA/PEM private keys
- Generic hardcoded passwords (`password = "..."`)
- API key assignments

**On match:** Blocks the write, logs to stderr with `[RapidX]` prefix, exits non-zero
**Exceptions:** `.env` files are skipped (they're expected to hold credentials)

### session-start

**Trigger:** Start of every Claude Code session
**Action:** Reads `.rapidx/stack.json` and active profile, generates `.rapidx/active-context.md` with the current tech stack and profile summary.

### session-end

**Trigger:** End of every Claude Code session
**Action:** Summarizes session activity from the audit log.

### governance-gate

**Trigger:** Ship / deploy operations
**Action:** Enforces mandatory review gates per active profile before allowing release.

---

## 13. Component Mapping — How Installation Stays Lean

The mapping engine (`src/map-components.js`) reads `src/component-map.json` and computes exactly which components to install based on stack selections.

### Example: React + TypeScript + PostgreSQL project

**Installs:**
```
Rules (2):    common, typescript
Skills (19):  coding-standards, security-review, tdd-workflow, strategic-compact,
              search-first, verification-loop, frontend-patterns, e2e-testing,
              backend-patterns, api-design, postgres-patterns, database-migrations,
              ai-governance, client-onboarding, review-gates, pod-maturity,
              architecture-copilot, + deployment-patterns (if Docker detected)
Agents (9):   planner, architect, tdd-guide, code-reviewer, security-reviewer,
              build-error-resolver, doc-updater, e2e-runner, refactor-cleaner, database-reviewer
Hooks (4):    session-start, session-end, audit-trail, secret-scanner
```

**Skips:**
```
Rules:   python, golang, java, swift, php
Skills:  django-*, springboot-*, golang-*, laravel-*, swift-*, cpp-*, perl-*
Agents:  go-reviewer, go-build-resolver, python-reviewer
```

### Extending the mapping

Edit `src/component-map.json` to add new frameworks, languages, or skills — no code changes needed. The mapping file is the single authoritative source for what gets installed when.

---

## 14. Configuration Files

### `.rapidx/stack.json` — Tech stack (generated by installer)

```json
{
  "detected_at": "2026-03-21T10:30:00Z",
  "frontend": { "framework": "react", "version": "18.3.1", "ui_library": ["tailwind"], "state_management": ["zustand"] },
  "backend": { "language": "typescript", "language_version": "5.4.5", "runtime": "node", "runtime_version": "20.11.0", "framework": "express" },
  "database": { "primary": "postgresql", "primary_version": "16.2", "orm": "prisma" },
  "infrastructure": { "cloud": "aws", "containers": ["docker"], "cicd": ["github-actions"] },
  "testing": { "unit": ["vitest"], "e2e": ["playwright"] },
  "installed_components": {
    "rules": ["common", "typescript"],
    "skills": ["coding-standards", "..."],
    "agents": ["planner", "..."],
    "hooks": ["session-start", "..."]
  }
}
```

### `CLAUDE.md` — Generated Claude Code config

Auto-generated with:
- Active profile and maturity level
- Full tech stack with exact versions
- Version-specific constraints ("Use React 18.3.1 only")
- List of active rules, skills, and agents
- All workflow commands

### `.github/copilot-instructions.md` — Copilot context

Automatically read by VS Code GitHub Copilot. Contains:
- Project context and active profile
- Tech stack with exact versions
- Coding standards summary
- Version-specific constraints
- References to installed skill files

### `.claude/settings.json` — Claude Code settings (merged)

Hook registrations are merged into this file. Existing keys are preserved.

### `.vscode/settings.json` — VS Code settings (merged)

RapidX adds its keys under the `"rapidx"` namespace. All other keys are preserved.

---

## 15. Installation Instructions

### Prerequisites

- Node.js 18 or higher
- At least one AI coding tool installed (Claude Code, VS Code + Copilot, Cursor, etc.)

### Quick install (interactive)

```bash
# Navigate to your project
cd your-project

# Run the installer
node /path/to/rapidx-platform/bin/install.js
```

### Global link (run `rapidx` from anywhere)

```bash
cd /path/to/rapidx-platform
npm link

# Now from any project:
cd your-project
rapidx
```

### Platform-specific quick starts

**Claude Code:**
```bash
node bin/install.js --claude --local --profile default
claude  # open Claude Code, then type /rapidx:new-project
```

**VS Code + GitHub Copilot:**
```bash
node bin/install.js --vscode --local --profile default
# Open VS Code → Copilot Chat →
# Attach: #file:.github/copilot/agents/rapidx-planner.md
# Then type your request, or open a .prompt.md file directly
```

**Cursor:**
```bash
node bin/install.js --cursor --local --profile default
# Open Cursor Composer → @.cursor/agents/rapidx-planner.md
# Or reference a command: @.cursor/commands/rapidx/new-project.md
```

**GitHub Copilot CLI:**
```bash
gh extension install github/gh-copilot  # install if needed
node bin/install.js --copilot-cli --local --profile default
gh copilot suggest "/rapidx:new-project"
```

**All platforms at once:**
```bash
node bin/install.js --all --local --profile enterprise-standard
```

---

## 16. Non-Interactive / CI Mode

All installer steps can be driven by flags for use in Docker, CI pipelines, or scripted provisioning.

```bash
# Full specification
node bin/install.js \
  --claude --cursor --vscode \
  --local \
  --profile enterprise-standard \
  --frontend react@18 \
  --backend typescript-express@4 \
  --db postgresql@16 --orm prisma \
  --cloud aws \
  --cicd github-actions \
  --testing vitest,playwright

# Auto-detect stack from project files
node bin/install.js --all --local --profile default --auto-detect

# Minimal Python setup
node bin/install.js --claude --local --profile default --backend python-fastapi

# Java / Spring Boot
node bin/install.js --claude --local --profile enterprise-standard --backend java-springboot@3 --db postgresql@15
```

### Full flag reference

| Flag | Description |
|------|-------------|
| `--claude` | Configure Claude Code CLI |
| `--vscode` | Configure VS Code + GitHub Copilot |
| `--cursor` | Configure Cursor IDE |
| `--copilot-cli` | Configure GitHub Copilot CLI |
| `--codex` | Configure Codex CLI/App |
| `--opencode` | Configure OpenCode |
| `--gemini` | Configure Gemini CLI |
| `--antigravity` | Configure Antigravity |
| `--all` | Configure all detected platforms |
| `--global` / `-g` | Install to `~/` (all projects on this machine) |
| `--local` / `-l` | Install to `./` (this project only) |
| `--profile <name>` | Set client profile |
| `--frontend <fw@ver>` | Frontend: `react@18`, `nextjs@14`, `angular@17`, `vue@3`, `svelte@4` |
| `--backend <stack@ver>` | Backend: `typescript-express@4`, `python-fastapi`, `python-django@5`, `java-springboot@3`, `golang`, `rust-axum`, `php-laravel@11`, `csharp-dotnet@8` |
| `--db <db@ver>` | Database: `postgresql@16`, `mysql@8`, `mongodb@7`, `dynamodb`, `sqlite` |
| `--orm <orm>` | ORM: `prisma`, `drizzle`, `typeorm`, `sqlalchemy`, `django-orm`, `jpa`, `gorm` |
| `--cache <cache>` | Cache: `redis`, `memcached` |
| `--cloud <provider>` | Cloud: `aws`, `azure`, `gcp` |
| `--cicd <platform>` | CI/CD: `github-actions`, `gitlab-ci`, `jenkins`, `azure-devops` |
| `--testing <list>` | Comma-separated: `jest`, `vitest`, `playwright`, `cypress`, `pytest`, `junit` |
| `--mobile <fw>` | Mobile: `react-native`, `flutter`, `swift`, `kotlin` |
| `--auto-detect` | Scan project files to determine tech stack |
| `--add-tech` | Add technology to existing installation |
| `--update` | Update framework, preserve user content |
| `--uninstall` | Remove all RapidX-managed files |
| `--skip-verify` | Skip post-install verification |

---

## 17. Adding Technologies Later

Add a new language, framework, or database to an existing installation without reinstalling everything.

```bash
# Interactive
node bin/install.js --add-tech

# Non-interactive
node bin/install.js --add-tech --backend golang --db mongodb
```

**Or from within Claude Code:**
```
/rapidx:add-tech
```

The add-tech flow:
1. Reads existing `.rapidx/stack.json`
2. Presents the tech stack questionnaire for the new category only
3. Computes delta — new components not already installed
4. Installs only the new components
5. Updates `.rapidx/stack.json`
6. Regenerates `CLAUDE.md`, `AGENTS.md`, and `copilot-instructions.md`
7. Shows a summary of what was added

---

## 18. Directory Structure

```
rapidx-platform/
│
├── bin/
│   └── install.js                    # Interactive installer entry point
│
├── src/
│   ├── detect-platforms.js           # Detect CLI tools, IDEs, extensions
│   ├── detect-stack.js               # Scan project files for tech versions
│   ├── component-map.json            # Data-driven stack → components mapping
│   ├── map-components.js             # Mapping logic layer
│   ├── prompt-ui.js                  # Zero-dependency ANSI terminal UI
│   ├── install-claude.js             # Claude Code installer
│   ├── install-vscode.js             # VS Code + Copilot installer
│   ├── install-cursor.js             # Cursor IDE installer
│   ├── install-copilot-cli.js        # GitHub Copilot CLI installer
│   ├── install-codex.js              # Codex installer
│   ├── install-opencode.js           # OpenCode installer
│   ├── install-gemini.js             # Gemini CLI installer
│   ├── install-antigravity.js        # Antigravity installer
│   ├── profile-loader.js             # Client profile loading + validation
│   ├── generate-claude-md.js         # CLAUDE.md generator
│   ├── generate-agents-md.js         # AGENTS.md generator
│   ├── generate-copilot-instructions.js  # copilot-instructions.md generator
│   ├── generate-commands.js          # GSD → multi-IDE command converter (Claude rapidx:*, Copilot .prompt.md, Cursor MDC)
│   ├── generate-commands-index.js    # Generates COMMANDS.md and Copilot index prompt
│   ├── agent-skill-map.json          # Maps each agent to its candidate skills
│   ├── inject-agent-skills.js        # Appends ## Active skills section to agent files at install time
│   ├── verify-install.js             # Post-install verification
│   ├── add-tech.js                   # Add technology to existing install
│   └── uninstall.js                  # Clean uninstall
│
├── templates/
│   ├── commands/rapidx/              # 9 /rapidx:* enterprise command files
│   ├── agents/                       # All agent markdown files
│   ├── rules/                        # Language rule sets (common, typescript, python, golang, java, swift, php)
│   ├── skills/
│   │   ├── raep-run/
│   │   │   ├── .cursor/agents/       # 10 Cursor MDC agent files (rapidx-*.md)
│   │   │   └── .github/copilot/
│   │   │       └── agents/           # 10 Copilot agent files (planner.md, etc — prefixed rapidx- on copy)
│   │   └── <skill-name>/             # 48 skill directories (SKILL.md + supporting files)
│   └── hooks/                        # Hook scripts (audit-trail, secret-scanner, session-start, governance-gate)
│
├── get-things-done/
│   ├── commands/gsd/                 # 53 Get Things Done workflow commands (source for conversion)
│   └── agents/                       # 19 GTD agents
│
├── profiles/
│   ├── _schema.json                  # Profile JSON schema
│   ├── default.json
│   ├── greenfield-startup.json
│   ├── enterprise-standard.json
│   ├── pharma-regulated.json
│   ├── finserv-sox.json
│   └── insurance-hipaa.json
│
├── tests/
│   ├── installer/                    # detect-platforms, detect-stack, map-components, install-flow, install-vscode
│   │                                 # generate-commands, inject-agent-skills
│   ├── profiles/                     # schema-validation, profile-loading
│   ├── hooks/                        # audit-trail, secret-scanner
│   ├── integration/                  # full-flow
│   └── run-all.js
│
└── package.json                      # name: rapidx-platform, bin: rapidx
```

**Runtime state (gitignored):**
```
.rapidx/
├── stack.json          # Tech stack config written by installer
├── active-context.md   # Generated on session start
└── audit/              # JSONL audit logs
```

---

## 19. Running Tests

```bash
# Run all tests
node tests/run-all.js

# Expected output
RapidX Platform Test Suite
══════════════════════════

  detect-platforms.test.js       ✓ 5 assertions
  detect-stack.test.js           ✓ 7 assertions
  map-components.test.js         ✓ 7 assertions
  generate-commands.test.js      ✓ 8 assertions
  inject-agent-skills.test.js    ✓ 11 assertions
  schema-validation.test.js      ✓ 8 assertions
  profile-loading.test.js        ✓ 7 assertions
  audit-trail.test.js            ✓ 4 assertions
  secret-scanner.test.js         ✓ 7 assertions
  full-flow.test.js              ✓ 9 assertions

  Passed: 10  |  All tests passed.
```

Tests use Node.js `assert` only — no test framework dependencies.

---

## Technical Constraints

- **Node.js 18+** required
- **Zero npm dependencies** — installer uses built-ins only
- **Terminal UI** uses raw ANSI escape codes — no inquirer, chalk, or ora
- **Profile files** under 50KB
- **Concatenated client context** under 15,000 tokens per subagent
- **Audit logs** in JSONL format
- **All hooks** complete in under 5 seconds
- **Works offline** for all core operations
- **VS Code settings.json** is always merged, never overwritten
- **Only stack-relevant components installed** — never all 48 skills

---

*Generated by RapidX Agentic Engineering Platform v1.0.0*
*Powered by Get Things Done + Everything Claude Code*
