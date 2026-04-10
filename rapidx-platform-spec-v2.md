# RapidX Agentic Engineering Platform — Build Specification

## Project identity

**Name:** RapidX Agentic Engineering Platform
**Codename:** `rapidx`
**Package name:** `rapidx-platform`
**Purpose:** A unified, enterprise-grade agentic SDLC orchestration framework that combines Get Things Done as the workflow engine with Everything Claude Code (ECC) as the enterprise component library, wrapped in a Hexaware customization layer for multi-client, multi-tool, regulated-industry delivery.
**License:** MIT (inheriting from both upstream repos)
**Target users:** Enterprise architects, delivery leads, and engineering teams at Hexaware client organizations using any combination of Claude Code, Cursor, VS Code + GitHub Copilot, Codex, or OpenCode.

### Naming conventions

- **RapidX** — the platform name used in all user-facing surfaces, documentation, commands, and branding
- **Get Things Done** — the internal name for the upstream GSD (Get Shit Done) workflow engine when referenced within RapidX. All user-facing text, command descriptions, help output, and documentation must use "Get Things Done" — never the upstream name. The upstream command namespace `/gsd:*` is preserved for compatibility but all descriptions and help text refer to "Get Things Done" or "GTD workflow."
- **ECC** — Everything Claude Code component library, referenced by its upstream name since it has no profanity concern

---

## 1. Problem statement

Enterprise customers each have their own coding guidelines, architectural patterns, security mandates, technology stacks, and regulatory compliance requirements. Today, agentic engineering tools (Claude Code, Cursor, VS Code + Copilot, Codex) ship with generic prompts and no per-client governance. Engineers working across clients must manually switch contexts, remember different standards, and hope the AI follows the right patterns.

RapidX solves this by creating a single framework where:
- The SDLC workflow (plan → build → review → test → ship) is structured and repeatable via the Get Things Done engine
- Coding standards, security rules, architectural patterns, and compliance mandates are injected per-client via ECC's modular architecture
- Only the skills, rules, and agents relevant to the project's specific technology stack are installed — no bloat, no irrelevant context consuming tokens
- A Hexaware enterprise layer manages client profiles, governance gates, audit trails, and maturity progression
- The same framework works across all major AI coding tools and IDEs
- An interactive installer detects the developer's environment, asks about their tech stack with version specifics, and configures everything automatically

---

## 2. Interactive installer specification

RapidX ships with an interactive CLI installer that detects the user's platforms and IDEs, captures their technology stack with specific versions, installs only the relevant components, and verifies the installation.

### 2.1 Installation entry point

```bash
npx rapidx-platform@latest
```

This launches the interactive installer. Non-interactive flags are also supported for CI/Docker.

### 2.2 Installer flow

**Step 1: Welcome and environment detection**

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
    ✗ OpenCode               not found

  IDEs & editors:
    ✓ VS Code                v1.96.2  (extensions: GitHub Copilot ✓, Copilot Chat ✓)
    ✓ Cursor IDE             v0.48.1
    ✗ JetBrains              not found

  Other:
    ✗ Gemini CLI             not found
    ✗ Antigravity            not found
```

The installer auto-detects platforms by checking:

| Platform | Detection method |
|----------|-----------------|
| Claude Code CLI | `claude --version` |
| Codex CLI | `codex --version` |
| OpenCode | `opencode --version` |
| VS Code | `code --version` |
| VS Code extensions | `code --list-extensions` filtered for `github.copilot`, `github.copilot-chat` |
| Cursor IDE | App presence at known paths (`/Applications/Cursor.app`, `~/.local/share/cursor/`, `%LOCALAPPDATA%\Programs\Cursor\`) + `.cursor/` directory |
| JetBrains IDEs | Presence of `.idea/` or known install paths for IntelliJ, WebStorm, PyCharm |
| Gemini CLI | `gemini --version` |
| Antigravity | `.agent/` directory or `antigravity --version` |
| GitHub Copilot CLI | `gh copilot --version` or `gh extension list` filtered for copilot |

**Step 2: Platform and IDE selection**

```
Which platforms and IDEs do you want to configure?
(Detected tools are pre-selected. You can add others.)

  AI coding tools:
    [✓] Claude Code CLI             (detected v2.3.1)
    [ ] Codex CLI / App
    [ ] OpenCode

  IDEs & editors:
    [✓] VS Code + GitHub Copilot    (detected — Copilot extension active)
    [✓] Cursor IDE                  (detected v0.48.1)
    [ ] JetBrains + AI Assistant

  Other:
    [ ] Gemini CLI
    [ ] Antigravity
    [ ] All platforms

  Use ↑↓ to move, Space to toggle, Enter to confirm
```

Note: VS Code and GitHub Copilot are presented as a single option "VS Code + GitHub Copilot" because Copilot is the AI coding assistant within VS Code. If VS Code is detected without the Copilot extension, the installer notes this and offers to provide installation instructions for the extension.

**Step 3: Technology stack discovery**

This is the critical step that determines which skills, rules, agents, and patterns are installed.

```
Let's configure your technology stack.
RapidX will install only the skills and rules relevant to your stack.

─── Frontend ───────────────────────────────────────────────

  Framework:
    ( ) React
    ( ) Next.js
    ( ) Angular
    ( ) Vue.js / Nuxt
    ( ) Svelte / SvelteKit
    ( ) None / not applicable

  Version: (detected from package.json: react@18.3.1)
    → React 18.3.1 [Enter to confirm, or type to override]

  UI library:
    [ ] Tailwind CSS
    [ ] Material UI / MUI
    [ ] Ant Design
    [ ] Chakra UI
    [ ] shadcn/ui
    [ ] None / custom

  State management:
    [ ] Redux / RTK
    [ ] Zustand
    [ ] Jotai / Recoil
    [ ] Context API only
    [ ] None

─── Backend ────────────────────────────────────────────────

  Language & framework:
    ( ) TypeScript / Node.js — Express
    ( ) TypeScript / Node.js — NestJS
    ( ) TypeScript / Node.js — Fastify
    ( ) Python — FastAPI
    ( ) Python — Django / DRF
    ( ) Python — Flask
    ( ) Java — Spring Boot
    ( ) Go — stdlib / Chi / Gin
    ( ) Rust — Axum / Actix
    ( ) C# — .NET / ASP.NET
    ( ) PHP — Laravel
    ( ) None / not applicable

  Version: (detected from package.json: node@20.11.0, typescript@5.4.5)
    → Node.js 20.11.0, TypeScript 5.4.5 [Enter to confirm]

  API style:
    [ ] REST
    [ ] GraphQL
    [ ] gRPC
    [ ] tRPC

─── Database ───────────────────────────────────────────────

  Primary database:
    ( ) PostgreSQL
    ( ) MySQL / MariaDB
    ( ) MongoDB
    ( ) DynamoDB
    ( ) SQL Server
    ( ) SQLite
    ( ) None / not applicable

  Version: [type version, or leave blank]
    → PostgreSQL 16.2

  ORM / query layer:
    ( ) Prisma
    ( ) Drizzle
    ( ) TypeORM
    ( ) Sequelize
    ( ) SQLAlchemy
    ( ) Django ORM
    ( ) JPA / Hibernate
    ( ) GORM
    ( ) Raw SQL
    ( ) None

  Cache layer:
    [ ] Redis
    [ ] Memcached
    [ ] None

─── Infrastructure & cloud ─────────────────────────────────

  Cloud provider:
    ( ) AWS
    ( ) Azure
    ( ) GCP
    ( ) On-premise / hybrid
    ( ) None / not decided

  Container & orchestration:
    [ ] Docker
    [ ] Kubernetes
    [ ] Docker Compose only
    [ ] None

  CI/CD:
    [ ] GitHub Actions
    [ ] GitLab CI
    [ ] Jenkins
    [ ] Azure DevOps
    [ ] CircleCI
    [ ] None

─── Testing ────────────────────────────────────────────────

  Test frameworks:
    [ ] Jest
    [ ] Vitest
    [ ] Playwright
    [ ] Cypress
    [ ] pytest
    [ ] JUnit
    [ ] Go testing
    [ ] None / will set up later

─── Mobile (optional) ──────────────────────────────────────

  Mobile framework:
    ( ) React Native
    ( ) Flutter
    ( ) Swift (iOS native)
    ( ) Kotlin (Android native)
    ( ) None / not applicable
```

**Version auto-detection:** Before presenting the tech stack questions, the installer scans the current project directory for:
- `package.json` → Node.js/TypeScript versions, framework versions, dependencies
- `requirements.txt` / `pyproject.toml` / `Pipfile` → Python packages and versions
- `go.mod` → Go version and dependencies
- `pom.xml` / `build.gradle` → Java/Spring versions
- `Gemfile` → Ruby versions
- `composer.json` → PHP/Laravel versions
- `Cargo.toml` → Rust versions
- `.tool-versions` / `.node-version` / `.python-version` → runtime versions
- `docker-compose.yml` → database and service versions
- `.github/workflows/*.yml` → CI/CD platform and runtime versions

When a version is auto-detected, it's pre-filled and the user just confirms with Enter. When not detected, the user types the version or skips.

**Step 4: Installation scope**

```
Where should RapidX be installed?

  ( ) Global — applies to all projects on this machine
      Installs to: ~/.claude/, ~/.cursor/, ~/.vscode/, etc.

  ( ) Local — applies to current project only
      Installs to: ./.claude/, ./.cursor/, ./.vscode/, etc.

  ( ) Both — global defaults + local project overrides
```

**Step 5: Client profile selection**

```
Select a client profile to start with:

  ( ) default              — Sensible defaults, no specific governance
  ( ) greenfield-startup   — Minimal governance, maximum speed
  ( ) enterprise-standard  — Standard enterprise controls
  ( ) pharma-regulated     — 21 CFR Part 11 compliance
  ( ) finserv-sox          — Financial services / SOX compliance
  ( ) insurance-hipaa      — Insurance / HIPAA compliance
  ( ) custom               — Run the client discovery questionnaire

  You can change this later with /rapidx:switch-client
```

**Step 6: Installation plan confirmation**

Before installing, show the user exactly what will be installed based on their selections:

```
Here's what RapidX will install based on your selections:

  Platforms:     Claude Code, VS Code + Copilot, Cursor
  Profile:       enterprise-standard
  Tech stack:    React 18 + TypeScript 5.4, Node.js 20 + Express,
                 PostgreSQL 16 + Prisma, Redis, AWS, Docker, GitHub Actions

  Components to install:
    Rules (12):  common (8), typescript (4)
    Skills (18): coding-standards, frontend-patterns, backend-patterns,
                 api-design, tdd-workflow, security-review, e2e-testing,
                 database-migrations, deployment-patterns, docker-patterns,
                 ...
    Agents (8):  planner, architect, tdd-guide, code-reviewer,
                 security-reviewer, build-error-resolver, e2e-runner,
                 doc-updater
    Hooks (6):   session-start, session-end, audit-trail, secret-scanner,
                 suggest-compact, evaluate-session

  Skipping (not relevant to your stack):
    Rules:       python, golang, java, swift, php
    Skills:      django-*, springboot-*, golang-*, swift-*, laravel-*,
                 cpp-*, perl-*, jpa-patterns, go-reviewer
    Agents:      go-reviewer, python-reviewer, go-build-resolver

  Proceed? [Y/n]
```

**Step 7: Installation execution**

```
Installing RapidX for Claude Code + VS Code + Cursor (local)...

  [ 1/10] Creating directory structure...              ✓
  [ 2/10] Installing Get Things Done engine...         ✓
  [ 3/10] Installing selected skills (18)...           ✓
  [ 4/10] Installing selected rules (12)...            ✓
  [ 5/10] Installing selected agents (8)...            ✓
  [ 6/10] Configuring Claude Code...                   ✓
  [ 7/10] Configuring VS Code + Copilot...             ✓
  [ 8/10] Configuring Cursor IDE...                    ✓
  [ 9/10] Loading client profile...                    ✓
  [10/10] Running verification...                      ✓

Installation complete!
```

**Step 8: Post-install summary and quick start**

```
✓ RapidX is ready!

  Profile:     enterprise-standard
  Platforms:   Claude Code, VS Code + GitHub Copilot, Cursor
  Tech stack:  React 18 · TypeScript 5.4 · Node.js 20 · Express
               PostgreSQL 16 · Prisma · Redis · AWS · Docker
  Location:    /Users/brijesh/my-project/

  Installed:   12 rules · 18 skills · 8 agents · 6 hooks
  Skipped:     22 rules · 47 skills · 5 agents (not relevant to your stack)

  Quick start:
    Claude Code:    claude → /gsd:new-project
    VS Code:        Open project → Copilot Chat → type /gsd:new-project
    Cursor:         Open project → AI chat → commands available

  Key commands:
    /gsd:new-project       Start a new project with Get Things Done workflow
    /gsd:map-codebase      Analyze existing codebase for migration
    /gsd:quick             Quick ad-hoc task or bug fix
    /rapidx:help           Show all RapidX commands
    /rapidx:switch-client  Change client profile
    /rapidx:add-tech       Add a technology to your stack later

  Config saved to: .rapidx/stack.json
  Docs: ./docs/TOOL-SETUP.md
```

### 2.3 Technology stack to component mapping

The installer uses a mapping table to determine which components are relevant for each technology choice. This is the core logic that makes installation selective.

**Language → rules mapping:**

| Language detected | Rules installed |
|-------------------|----------------|
| TypeScript / JavaScript | `rules/common/` + `rules/typescript/` |
| Python | `rules/common/` + `rules/python/` |
| Go | `rules/common/` + `rules/golang/` |
| Java | `rules/common/` + `rules/java/` |
| Swift | `rules/common/` + `rules/swift/` |
| PHP | `rules/common/` + `rules/php/` |
| Rust | `rules/common/` (no Rust-specific rules yet) |
| C# | `rules/common/` (no C#-specific rules yet) |

**Technology → skills mapping:**

| Technology selection | Skills installed |
|---------------------|-----------------|
| *Always installed* | `coding-standards`, `security-review`, `tdd-workflow`, `strategic-compact`, `search-first`, `verification-loop` |
| React / Next.js / Vue / Angular / Svelte | `frontend-patterns`, `e2e-testing` |
| Node.js / Express / NestJS / Fastify | `backend-patterns`, `api-design` |
| Python / FastAPI | `backend-patterns`, `api-design`, `python-patterns`, `python-testing` |
| Python / Django | `backend-patterns`, `api-design`, `django-patterns`, `django-security`, `django-tdd`, `django-verification` |
| Java / Spring Boot | `backend-patterns`, `api-design`, `springboot-patterns`, `springboot-security`, `springboot-tdd`, `springboot-verification`, `java-coding-standards`, `jpa-patterns` |
| Go | `backend-patterns`, `api-design`, `golang-patterns`, `golang-testing` |
| PHP / Laravel | `backend-patterns`, `api-design`, `laravel-patterns`, `laravel-security`, `laravel-tdd`, `laravel-verification` |
| Swift | `swift-actor-persistence`, `swift-protocol-di-testing`, `swift-concurrency-6-2` |
| Rust | `backend-patterns`, `api-design` |
| C++ | `cpp-coding-standards`, `cpp-testing` |
| Perl | `perl-patterns`, `perl-security`, `perl-testing` |
| PostgreSQL | `postgres-patterns`, `database-migrations` |
| Any database | `database-migrations` |
| Docker | `docker-patterns`, `deployment-patterns` |
| Kubernetes | `deployment-patterns`, `docker-patterns` |
| Any CI/CD | `deployment-patterns` |
| Playwright selected | `e2e-testing` |
| REST API style | `api-design` |
| GraphQL API style | `api-design` |
| React Native / Flutter | `frontend-patterns` |
| iOS native (Swift) | `swift-actor-persistence`, `swift-protocol-di-testing`, `liquid-glass-design`, `foundation-models-on-device` |

**Technology → agents mapping:**

| Technology selection | Agents installed |
|---------------------|-----------------|
| *Always installed* | `planner`, `architect`, `tdd-guide`, `code-reviewer`, `security-reviewer`, `build-error-resolver`, `doc-updater` |
| Any frontend framework | `e2e-runner`, `refactor-cleaner` |
| Go | `go-reviewer`, `go-build-resolver` |
| Python | `python-reviewer` |
| Any database | `database-reviewer` |

**RapidX-specific components (always installed when selected profile warrants):**

| Profile type | Extra skills |
|-------------|-------------|
| *Always* | `ai-governance`, `client-onboarding`, `review-gates` |
| Any regulated profile | `compliance-packs/{relevant}` |
| Modernization engagement | `migration-framework` |
| Any | `pod-maturity`, `architecture-copilot` |

### 2.4 Tech stack configuration file

The installer saves the complete tech stack to `.rapidx/stack.json` so it can be referenced by the profile loader, used for future updates, and modified later.

```json
{
  "detected_at": "2026-03-21T10:30:00Z",
  "auto_detected": {
    "node": "20.11.0",
    "typescript": "5.4.5",
    "react": "18.3.1",
    "from_files": ["package.json", ".node-version"]
  },
  "frontend": {
    "framework": "react",
    "version": "18.3.1",
    "ui_library": ["tailwind", "shadcn"],
    "state_management": ["zustand"]
  },
  "backend": {
    "language": "typescript",
    "language_version": "5.4.5",
    "runtime": "node",
    "runtime_version": "20.11.0",
    "framework": "express",
    "framework_version": "4.18.2",
    "api_style": ["rest"]
  },
  "database": {
    "primary": "postgresql",
    "primary_version": "16.2",
    "orm": "prisma",
    "orm_version": "5.10.0",
    "cache": ["redis"]
  },
  "infrastructure": {
    "cloud": "aws",
    "containers": ["docker", "docker-compose"],
    "cicd": ["github-actions"],
    "orchestration": null
  },
  "testing": {
    "unit": ["vitest"],
    "e2e": ["playwright"],
    "coverage_tool": null
  },
  "mobile": null,
  "installed_components": {
    "rules": ["common", "typescript"],
    "skills": ["coding-standards", "frontend-patterns", "backend-patterns", "..."],
    "agents": ["planner", "architect", "tdd-guide", "..."],
    "hooks": ["session-start", "audit-trail", "..."]
  }
}
```

### 2.5 Adding technologies later

Users can add technologies to their stack after initial installation:

```bash
npx rapidx-platform --add-tech
```

Or within Claude Code:
```
/rapidx:add-tech
```

This re-runs the tech stack questionnaire for the new category (e.g., "I'm adding a Python microservice"), installs only the delta of new skills/rules/agents, and updates `.rapidx/stack.json`.

### 2.6 Non-interactive installation (CI/Docker)

```bash
# Full specification
npx rapidx-platform \
  --claude --cursor --vscode \
  --local \
  --profile enterprise-standard \
  --frontend react@18 \
  --backend typescript-express@4 \
  --db postgresql@16 --orm prisma \
  --cloud aws \
  --cicd github-actions \
  --testing vitest,playwright

# Minimal
npx rapidx-platform --claude --local --profile default --backend python-fastapi

# All platforms, auto-detect stack from project files
npx rapidx-platform --all --local --profile default --auto-detect

# Uninstall
npx rapidx-platform --claude --vscode --local --uninstall

# Update (preserves stack and profiles)
npx rapidx-platform --update

# Add tech to existing install
npx rapidx-platform --add-tech --backend golang --db mongodb
```

Flag reference:

| Flag | Description |
|------|-------------|
| **Platforms** | |
| `--claude` | Install for Claude Code CLI |
| `--cursor` | Install for Cursor IDE |
| `--vscode` | Install for VS Code + GitHub Copilot |
| `--copilot-cli` | Install for GitHub Copilot CLI (standalone) |
| `--codex` | Install for Codex CLI/App |
| `--opencode` | Install for OpenCode |
| `--gemini` | Install for Gemini CLI |
| `--antigravity` | Install for Antigravity |
| `--all` | Install for all detected platforms |
| **Scope** | |
| `--global` / `-g` | Install to user home directory |
| `--local` / `-l` | Install to current project directory |
| **Profile** | |
| `--profile <name>` | Set client profile |
| **Tech stack** | |
| `--frontend <fw@ver>` | Frontend framework (react@18, nextjs@14, angular@17, vue@3, svelte@4) |
| `--backend <lang-fw@ver>` | Backend (typescript-express@4, python-fastapi, python-django@5, java-springboot@3, golang, rust-axum, php-laravel@11, csharp-dotnet@8) |
| `--db <db@ver>` | Database (postgresql@16, mysql@8, mongodb@7, dynamodb, sqlite) |
| `--orm <orm>` | ORM (prisma, drizzle, typeorm, sqlalchemy, django-orm, jpa, gorm) |
| `--cache <cache>` | Cache (redis, memcached) |
| `--cloud <provider>` | Cloud (aws, azure, gcp) |
| `--cicd <platform>` | CI/CD (github-actions, gitlab-ci, jenkins, azure-devops) |
| `--testing <frameworks>` | Comma-separated (jest, vitest, playwright, cypress, pytest, junit) |
| `--mobile <fw>` | Mobile (react-native, flutter, swift, kotlin) |
| `--auto-detect` | Scan project files to determine tech stack |
| **Operations** | |
| `--add-tech` | Add technology to existing installation |
| `--update` | Update framework, preserve user content |
| `--uninstall` | Remove RapidX |
| `--check-update` | Check for available updates |
| `--skip-verify` | Skip post-install verification |

### 2.7 Per-platform installation details

Each platform has different config structures. The installer maps RapidX components to the correct locations:

**Claude Code CLI:**
| RapidX component | Installed to |
|------------------|-------------|
| GTD commands | `{root}/.claude/commands/gsd/` |
| RapidX commands | `{root}/.claude/commands/rapidx/` |
| Settings + hooks | `{root}/.claude/settings.json` |
| CLAUDE.md | `{root}/CLAUDE.md` |
| Rules | `{root}/.claude/rules/` (if supported) or embedded in CLAUDE.md |

**VS Code + GitHub Copilot:**
| RapidX component | Installed to |
|------------------|-------------|
| Copilot instructions | `{root}/.github/copilot-instructions.md` |
| VS Code settings | `{root}/.vscode/settings.json` (merge, don't overwrite) |
| Workspace recommendations | `{root}/.vscode/extensions.json` (recommend copilot extensions) |
| Prompt files | `{root}/.github/copilot/` (custom prompt files if supported) |
| Skills as context | `{root}/.github/copilot/skills/` (referenced in instructions) |
| AGENTS.md | `{root}/AGENTS.md` (Copilot reads this) |

For VS Code + Copilot, the installer:
1. Checks if `github.copilot` and `github.copilot-chat` extensions are installed via `code --list-extensions`
2. If not installed, prints: "GitHub Copilot extension not detected. Install it from: https://marketplace.visualstudio.com/items?itemName=GitHub.copilot"
3. Generates `.github/copilot-instructions.md` — this is the primary file Copilot reads for project-level instructions. It contains the active profile summary, coding standards, and tech stack context.
4. Generates `.vscode/settings.json` additions (merged with existing) for Copilot configuration
5. Creates `.vscode/extensions.json` recommending `github.copilot` and `github.copilot-chat`
6. Optionally generates workspace-scoped prompt snippets in `.github/copilot/`

**Cursor IDE:**
| RapidX component | Installed to |
|------------------|-------------|
| Rules | `{root}/.cursor/rules/` (YAML frontmatter format) |
| Hooks | `{root}/.cursor/hooks/` (via adapter.js) |
| Skills | `{root}/.cursor/skills/` |
| MCP config | `{root}/.cursor/mcp.json` |
| AGENTS.md | `{root}/AGENTS.md` |

**GitHub Copilot CLI (standalone):**
| RapidX component | Installed to |
|------------------|-------------|
| Instructions | `{root}/.github/copilot/instructions.md` |
| Skills | `{root}/.github/copilot/skills/` |

**Codex CLI/App:**
| RapidX component | Installed to |
|------------------|-------------|
| Config | `{root}/.codex/config.toml` |
| AGENTS.md | `{root}/.codex/AGENTS.md` |
| Skills | `{root}/.agents/skills/` |

**OpenCode:**
| RapidX component | Installed to |
|------------------|-------------|
| Config | `{root}/.opencode/opencode.json` |
| Instructions | `{root}/.opencode/instructions/` |

Where `{root}` is `~/` for global or `./` for local installs.

### 2.8 Installer implementation

The installer is a single Node.js script (`bin/install.js`) with these requirements:
- Node.js 18+ built-ins only (fs, path, child_process, readline, crypto)
- Terminal UI using raw ANSI escape codes — no `inquirer`, `chalk`, or other npm packages
- Platform detection using `child_process.execSync` with try/catch
- Version detection by parsing `package.json`, `pyproject.toml`, `go.mod`, etc.
- File operations using `fs.mkdirSync`, `fs.copyFileSync`, `fs.writeFileSync`
- Smart merging for `settings.json` files — read existing, merge RapidX keys, write back

Installer source modules:

```
src/
├── detect-platforms.js       # Detect CLI tools, IDEs, extensions
├── detect-stack.js           # Scan project files for tech stack versions
├── prompt-ui.js              # Terminal UI (multi-select, single-select, progress)
├── map-components.js         # Tech stack → components mapping logic
├── install-claude.js         # Claude Code platform installer
├── install-cursor.js         # Cursor IDE platform installer
├── install-vscode.js         # VS Code + GitHub Copilot installer
├── install-copilot-cli.js    # GitHub Copilot CLI (standalone) installer
├── install-codex.js          # Codex platform installer
├── install-opencode.js       # OpenCode platform installer
├── install-gemini.js         # Gemini CLI platform installer
├── install-antigravity.js    # Antigravity platform installer
├── profile-loader.js         # Client profile loading and validation
├── generate-claude-md.js     # CLAUDE.md template generator
├── generate-agents-md.js     # AGENTS.md generator for cross-tool compat
├── generate-copilot-instructions.js  # .github/copilot-instructions.md generator
├── verify-install.js         # Post-install verification
├── add-tech.js               # Add technology to existing install
└── uninstall.js              # Clean uninstall
```

### 2.9 Update mechanism

```bash
npx rapidx-platform --update
```

The updater:
1. Reads `.rapidx/stack.json` to know current tech stack
2. Reads active profile from `.planning/config.json`
3. Backs up user-created content: `profiles/`, `rules/clients/`, `skills/rapidx/`, `.rapidx/`
4. Reinstalls framework files (only components matching the saved tech stack)
5. Restores user content
6. Regenerates CLAUDE.md, AGENTS.md, copilot-instructions.md from active profile
7. Runs verification

---

## 3. Architecture overview

RapidX is a three-layer system. Each layer has clear responsibilities and well-defined integration seams.

### Layer 1: Get Things Done — SDLC orchestration engine (upstream fork)

**Source:** https://github.com/gsd-build/get-shit-done (MIT, fork at v1.26.0+)
**Internal name within RapidX:** Get Things Done (GTD)
**Role:** Owns the workflow state machine, project lifecycle, context engineering, and parallel execution.

The Get Things Done engine provides:
- Project initialization (`new-project`) with requirements extraction and roadmap generation
- Phase-based development lifecycle: discuss → plan → execute → verify → ship
- Brownfield codebase mapping (`map-codebase`) for migration and modernization
- Context anti-rot via fresh 200K-token subagent contexts per plan
- Wave-based parallel execution with dependency tracking
- XML-structured task plans with built-in verification steps
- Atomic git commits per task with clean history
- State management via `.planning/` directory
- Quick mode for ad-hoc tasks, bug fixes, and hotfixes
- Milestone lifecycle (complete-milestone → new-milestone)
- Multi-runtime support

**What we modify:**
- Planner agent prompt: loads client-specific rules and skills (filtered by tech stack)
- Executor subagent prompt: loads relevant ECC agents per task type and tech stack
- Verify-work step: invokes automated quality gates
- Config schema: extended with `client_profile` and `tech_stack` fields
- New-project flow: extended with profile and tech stack awareness
- All help text: reworded to say "Get Things Done"

**What we do NOT modify:**
- Core orchestration logic, command namespace `/gsd:*`, planning artifact format, git commit strategy

### Layer 2: ECC — Enterprise component library (upstream fork)

**Source:** https://github.com/affaan-m/everything-claude-code (MIT, fork at v1.8.0+)
**Role:** Owns coding standards, quality rules, specialized agents, skills, hooks, security scanning, and multi-runtime configuration.

**Key:** Only the subset of ECC components matching the project's tech stack are installed and loaded into context. This is critical for token efficiency — loading all 108 skills would waste context on irrelevant patterns.

### Layer 3: RapidX enterprise extensions (new code)

**Role:** Owns the installer, client profiles, tech stack configuration, governance, observability, maturity model gates, and the onboarding experience.

---

## 4. Directory structure

```
rapidx-platform/
│
├── CLAUDE.md                         # Generated: master config for Claude Code
├── AGENTS.md                         # Generated: cross-tool agent config
├── package.json                      # npm: rapidx-platform
│
├── bin/
│   └── install.js                    # Interactive installer entry point
│
├── src/                              # Installer modules (see section 2.8)
│
├── .claude/                          # Claude Code configs
│   ├── commands/
│   │   ├── gsd/                      # Get Things Done commands
│   │   └── rapidx/                   # RapidX commands
│   └── settings.json
│
├── .vscode/                          # VS Code configs
│   ├── settings.json                 # Copilot settings (merged)
│   └── extensions.json               # Recommended extensions
│
├── .github/
│   ├── copilot-instructions.md       # Generated: Copilot project instructions
│   └── copilot/                      # Copilot custom prompts and skills
│
├── .cursor/                          # Cursor IDE configs
│   ├── hooks/
│   ├── rules/
│   └── mcp.json
│
├── .codex/                           # Codex configs
├── .opencode/                        # OpenCode configs
│
├── agents/                           # Installed agents (filtered by stack)
│   ├── planner.md
│   ├── architect.md
│   ├── tdd-guide.md
│   ├── code-reviewer.md
│   ├── security-reviewer.md
│   ├── build-error-resolver.md
│   ├── ... (only stack-relevant agents)
│   └── rapidx/
│       ├── governance-auditor.md
│       ├── migration-analyst.md
│       ├── compliance-checker.md
│       └── client-onboarder.md
│
├── rules/                            # Installed rules (filtered by stack)
│   ├── common/                       # Always installed
│   ├── typescript/                   # Only if TS in stack
│   ├── python/                       # Only if Python in stack
│   ├── golang/                       # Only if Go in stack
│   ├── java/                         # Only if Java in stack
│   ├── ... (only stack-relevant)
│   └── clients/
│       ├── _template/
│       └── ... (per-client packs)
│
├── skills/                           # Installed skills (filtered by stack)
│   ├── coding-standards/             # Always installed
│   ├── security-review/              # Always installed
│   ├── tdd-workflow/                 # Always installed
│   ├── frontend-patterns/            # Only if frontend in stack
│   ├── backend-patterns/             # Only if backend in stack
│   ├── django-patterns/              # Only if Django in stack
│   ├── springboot-patterns/          # Only if Spring Boot in stack
│   ├── ... (only stack-relevant)
│   └── rapidx/
│       ├── ai-governance/
│       ├── client-onboarding/
│       ├── migration-framework/
│       └── compliance-packs/
│
├── hooks/
│   ├── hooks.json
│   └── rapidx/
│
├── scripts/
│   ├── lib/
│   ├── hooks/
│   └── rapidx/
│
├── get-things-done/                  # GTD core engine (vendored)
│
├── profiles/                         # Client profiles
│   ├── _schema.json
│   ├── default.json
│   ├── greenfield-startup.json
│   ├── enterprise-standard.json
│   ├── pharma-regulated.json
│   ├── finserv-sox.json
│   └── insurance-hipaa.json
│
├── templates/                        # All installable content (full set)
│   ├── commands/
│   ├── agents/                       # ALL agents (installer picks subset)
│   ├── rules/                        # ALL rules (installer picks subset)
│   ├── skills/                       # ALL skills (installer picks subset)
│   ├── hooks/
│   ├── profiles/
│   └── docs/
│
├── tests/
│
├── docs/
│
├── .planning/                        # GTD state (gitignored)
│
├── .rapidx/                          # RapidX runtime state (gitignored)
│   ├── stack.json                    # Tech stack config (from installer)
│   ├── active-context.md             # Generated: active config summary
│   └── audit/                        # Audit logs
│
└── mcp-configs/
    └── mcp-servers.json
```

---

## 5. Client profile schema

Same as previous spec section with one addition — the profile now includes a `tech_stack` reference:

```json
{
  "profile_id": "pharma-21cfr",
  "client_name": "Acme Pharma Inc.",
  "version": "1.0.0",

  "engagement": {
    "type": "modernization",
    "maturity_level": "L2",
    "tech_stack_ref": ".rapidx/stack.json"
  },

  "rules": {
    "common": true,
    "languages_from_stack": true,
    "client_pack": "pharma-21cfr"
  },

  "skills": {
    "from_stack": true,
    "compliance": ["21cfr-part11"],
    "rapidx": ["ai-governance", "review-gates", "migration-framework"],
    "client_specific": []
  },

  "agents": {
    "from_stack": true,
    "code_reviewer": { "enabled": true, "load_client_mandates": true },
    "security_reviewer": { "enabled": true, "load_compliance_pack": true, "block_on_critical": true },
    "tdd_guide": { "enabled": true, "coverage_threshold": 80 },
    "governance_auditor": { "enabled": true, "audit_level": "full" }
  },

  "hooks": {
    "profile": "strict",
    "audit_trail": { "enabled": true, "log_destination": ".rapidx/audit/" },
    "secret_detection": { "enabled": true, "block_on_match": true },
    "governance_gate": { "enabled": true, "require_review_before_ship": true }
  },

  "model_routing": {
    "profile": "quality",
    "overrides": { "planning": "opus", "execution": "sonnet", "review": "opus" }
  },

  "gtd_config": {
    "mode": "interactive",
    "granularity": "fine",
    "workflow": { "research": true, "plan_check": true, "verifier": true },
    "git": { "branching_strategy": "phase", "phase_branch_template": "rapidx/phase-{phase}-{slug}" }
  },

  "maturity_gates": {
    "current_level": "L2",
    "L0_traditional": { "require_human_approval": "all_phases", "parallel_execution": false },
    "L1_assisted": { "require_human_approval": "plan_and_ship", "parallel_execution": false },
    "L2_augmented": { "require_human_approval": "ship_only", "parallel_execution": true, "max_parallel": 3 },
    "L3_orchestrated": { "require_human_approval": "milestone_only", "parallel_execution": true, "max_parallel": 8 },
    "L4_autonomous": { "require_human_approval": "none", "parallel_execution": true, "max_parallel": 15 }
  },

  "review_gates": {
    "architecture_review": { "required_for": ["new-project"], "reviewer_agent": "architect" },
    "security_review": { "required_for": ["ship"], "reviewer_agent": "security-reviewer", "block_on_critical": true },
    "compliance_review": { "required_for": ["ship"], "reviewer_agent": "compliance-checker" },
    "code_review": { "required_for": ["ship"], "reviewer_agent": "code-reviewer" }
  }
}
```

The `from_stack: true` fields mean: resolve languages, skills, and agents by reading `.rapidx/stack.json` and applying the mapping tables from section 2.3. This keeps profiles DRY — you don't have to list every skill manually.

---

## 6. Integration seam specifications

### Seam 1: GTD planner reads client rules (filtered by stack)

When the planner spawns, it reads only the rules and skills that match the tech stack in `.rapidx/stack.json`. A React + TypeScript + PostgreSQL project gets TypeScript rules, frontend-patterns, backend-patterns, postgres-patterns, and database-migrations — not Django, Spring Boot, or Go patterns.

**Size budget:** Concatenated client context must not exceed 15,000 tokens.

### Seam 2: GTD executor loads stack-relevant ECC agents

Task type + tech stack determine which agents load. A `type="frontend"` task in a React project loads `e2e-runner` and `frontend-patterns` skill. A `type="database"` task in a PostgreSQL project loads `database-reviewer` and `postgres-patterns`.

### Seam 3: Hooks fire during GTD execution

RapidX hooks (`audit-trail.js`, `governance-gate.js`, `secret-scanner.js`, `maturity-enforcer.js`) fire alongside ECC hooks on every tool event.

### Seam 4: Quality gates before verify-work

AgentShield + code-review + test-coverage + governance-check run before human UAT. Results in `.planning/{phase}-QUALITY-GATE.md`.

### Seam 5: Profile-driven initialization

SessionStart hook loads profile and tech stack, generates `.rapidx/active-context.md`.

---

## 7. CLAUDE.md template

The generated CLAUDE.md now includes tech stack context:

```markdown
# RapidX Agentic Engineering Platform

## Active configuration
Client: {{client_name}} | Profile: {{profile_id}} | Maturity: {{maturity_level}}

## Technology stack
Frontend: {{frontend_framework}} {{frontend_version}} + {{ui_library}}
Backend: {{backend_language}} {{backend_version}} / {{backend_framework}} {{framework_version}}
Database: {{database}} {{db_version}} + {{orm}}
Cache: {{cache}}
Cloud: {{cloud_provider}}
CI/CD: {{cicd}}
Testing: {{test_frameworks}}

## Get Things Done workflow commands
/gsd:new-project, /gsd:discuss-phase, /gsd:plan-phase, /gsd:execute-phase,
/gsd:verify-work, /gsd:ship, /gsd:quick, /gsd:map-codebase, /gsd:next,
/gsd:progress, /gsd:complete-milestone, /gsd:new-milestone, ...

## RapidX enterprise commands
/rapidx:init-client, /rapidx:switch-client, /rapidx:governance-check,
/rapidx:maturity-gate, /rapidx:audit-report, /rapidx:onboard-codebase,
/rapidx:add-tech, /rapidx:help

## Active rules
{{rules_list}}

## Active skills
{{skills_list_with_descriptions}}

## Review gates
{{review_gates_summary}}

## Coding standards
Enforce rules from: rules/common/ + rules/{{languages}}/
Client mandates: rules/clients/{{client_pack}}/

## Version-specific guidance
- {{backend_language}} {{backend_version}}: Use features available up to this version
- {{frontend_framework}} {{frontend_version}}: Use APIs and patterns from this version
- {{database}} {{db_version}}: Use features available in this version
- Do NOT use features from newer versions than specified above
```

---

## 8. Key commands

(Same as previous spec, plus one new command)

### /rapidx:add-tech

**Purpose:** Add a technology to the project stack after initial installation.
**Flow:**
1. Present tech stack questionnaire for the new category
2. Determine delta of new skills/rules/agents needed
3. Install only the new components
4. Update `.rapidx/stack.json`
5. Regenerate CLAUDE.md, AGENTS.md, copilot-instructions.md
6. Output summary of what was added

---

## 9. Build plan

### Sprint 1: Foundation (priority order)

1. **npm package scaffold** — `rapidx-platform` repo, package.json, bin entry, directory structure
2. **Platform and stack detection** — `src/detect-platforms.js` (including VS Code + Copilot extension detection), `src/detect-stack.js` (parse package.json, pyproject.toml, go.mod, etc.)
3. **Terminal UI** — `src/prompt-ui.js` with multi-select, single-select, progress bar, ANSI codes only
4. **Component mapping engine** — `src/map-components.js` implementing the tech stack → components tables from section 2.3
5. **Interactive installer flow** — `bin/install.js` wiring all steps together
6. **Per-platform installers** — claude, vscode, cursor, copilot-cli, codex, opencode (each with their specific file layouts)
7. **VS Code + Copilot installer** — `src/install-vscode.js` generating copilot-instructions.md, settings.json merge, extensions.json
8. **Client profile system** — schema, default profiles, profile-loader
9. **CLAUDE.md + AGENTS.md + copilot-instructions.md generators** — template interpolation with tech stack context
10. **RapidX commands** — all `/rapidx:*` command files including `/rapidx:add-tech`
11. **GTD planner integration (Seam 1)** — inject stack-filtered client context
12. **Basic governance hooks** — audit-trail, secret-scanner
13. **Tests** — installer, profile, component mapping, hooks
14. **Non-interactive flag support** — all CLI flags from section 2.6

### Sprint 2: Governance and compliance
(Same as previous spec)

### Sprint 3: Platform, migration, and polish
(Same as previous spec, plus VS Code + Copilot validation testing)

---

## 10. Technical constraints

- **Node.js 18+** required
- **Installer has zero npm dependencies** — Node.js built-ins only
- **Terminal UI uses raw ANSI escape codes** — no inquirer, chalk, or ora
- **Profile files under 50KB**
- **Concatenated client context under 15,000 tokens** per subagent
- **Audit logs use JSONL format**
- **All hooks complete in under 5 seconds**
- **Framework works offline** for core operations
- **One atomic commit per task**
- **All user-facing text says "Get Things Done"**
- **Only stack-relevant components are installed** — never install all 108 skills
- **VS Code settings.json is merged, never overwritten** — read existing, add RapidX keys, write back
- **Version-specific guidance in CLAUDE.md** — agent must not suggest features from newer versions than specified

---

## 11. Success criteria

### Sprint 1 done when:
1. `npx rapidx-platform` runs interactive installer on macOS and Linux
2. Installer detects Claude Code, VS Code + Copilot extensions, and Cursor
3. Tech stack questionnaire captures frontend, backend, DB, infrastructure with version auto-detection
4. Installation plan shows exactly which components will be installed and which will be skipped
5. VS Code + Copilot gets a properly generated `.github/copilot-instructions.md` with tech stack context
6. A React + TypeScript + Express + PostgreSQL project installs ~18 skills, not all 108
7. `/rapidx:add-tech` correctly adds new components without duplicating existing ones
8. `/gsd:plan-phase 1` produces plans referencing the correct framework versions
9. All tests pass

---

## 12. Risks and mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Upstream GSD breaks compatibility | High | Pin version, vendor fork, quarterly sync |
| Upstream ECC restructures components | Medium | Vendor fork, selective cherry-pick |
| Client context exceeds token budget | High | 15K ceiling, auto-summarize, stack filtering |
| Component mapping becomes stale | Medium | Mapping table in separate JSON file, easy to update |
| VS Code Copilot instructions format changes | Medium | Track GitHub Copilot changelog, abstract generation |
| Version auto-detection fails | Low | Graceful fallback to manual entry, always confirm |
| New framework not in mapping table | Medium | `--add-tech` with custom skill generation, extensible mapping |
| Installer fails on Windows | Medium | PowerShell variant, WSL testing |
