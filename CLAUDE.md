# CLAUDE.md — RapidX Agentic Engineering Platform

## What this project is

RapidX is a unified enterprise-grade agentic SDLC orchestration framework combining:
- **Get Things Done** — SDLC workflow engine (plan → build → review → test → ship). Forked from the upstream "GSD" project — always call it "Get Things Done" in code, docs, and user-facing text. Never use the upstream's original name.
- **ECC (Everything Claude Code)** — Enterprise component library (rules, skills, agents, hooks, security)
- **RapidX enterprise layer** — Multi-client profiles, tech-stack-aware installation, governance gates, compliance packs, maturity progression, and interactive multi-platform installer

The full spec is in `rapidx-platform-spec-v2.md` — read it completely before making any architectural decisions.

## Naming rules (critical)

- Platform: **RapidX** everywhere
- Workflow engine: **Get Things Done** or **GTD** — never the upstream name
- Command namespace: `/gsd:*` kept for compat, descriptions say "Get Things Done"
- Enterprise commands: `/rapidx:*`
- Vendored engine directory: `get-things-done/`
- Environment variables: `RAPIDX_` prefix
- Runtime state: `.rapidx/`

## Build instructions — start here

Read the full spec first. Then build in this exact order.

### Phase 1: npm package scaffold

```
rapidx-platform/
├── bin/install.js          # Entry point: #!/usr/bin/env node
├── src/                    # Installer modules
├── templates/              # ALL installable content (full set, installer picks subset)
├── profiles/               # Client profile JSONs
├── tests/
├── package.json            # name: "rapidx-platform", bin: { "rapidx": "bin/install.js" }
└── README.md
```

### Phase 2: Platform and stack detection (build these first)

**`src/detect-platforms.js`** — Detect all development tools and IDEs:

```javascript
// Must detect these platforms:
// CLI tools: claude, codex, opencode, gemini, gh copilot
// IDEs: VS Code (code --version), Cursor (app path detection)
// VS Code extensions: code --list-extensions → check for github.copilot, github.copilot-chat
// JetBrains: .idea/ directory or known install paths
// Antigravity: .agent/ directory

// Returns:
{
  claude: { detected: true, version: "2.3.1" },
  vscode: { detected: true, version: "1.96.2", copilot: true, copilotChat: true },
  cursor: { detected: true, version: "0.48.1" },
  copilotCli: { detected: false },
  codex: { detected: false },
  opencode: { detected: false },
  gemini: { detected: false },
  antigravity: { detected: false },
  jetbrains: { detected: false }
}
```

**`src/detect-stack.js`** — Scan project files for technology versions:

Must parse these files:
- `package.json` → node version (engines), typescript version, react/next/angular/vue version, express/nestjs/fastify, jest/vitest/playwright, prisma/drizzle/typeorm
- `tsconfig.json` → typescript target
- `.node-version` / `.nvmrc` → node version
- `requirements.txt` / `pyproject.toml` / `Pipfile` → python packages and versions
- `.python-version` → python version
- `go.mod` → go version, dependencies
- `pom.xml` / `build.gradle` → java version, spring boot version
- `Gemfile` → ruby version
- `composer.json` → php version, laravel version
- `Cargo.toml` → rust edition/version
- `.tool-versions` → any runtime version (asdf format)
- `docker-compose.yml` → database images with version tags (postgres:16, mysql:8, redis:7, mongo:7)
- `.github/workflows/*.yml` → CI/CD platform, runtime versions in setup actions

Returns a structured object with all detected versions, keyed by technology name. Undetected items are null. Every detected item includes the source file it was found in.

### Phase 3: Component mapping engine

**`src/map-components.js`** — This is the core logic that makes installation selective.

Build the mapping tables from spec section 2.3. The function takes the user's tech stack selections and returns exactly which rules, skills, agents, and hooks to install.

```javascript
// Input: user's selections from the tech stack questionnaire
// Output: { rules: [...], skills: [...], agents: [...], hooks: [...], skipped: { rules: [...], skills: [...], agents: [...] } }

function mapComponents(stackConfig) {
  const components = { rules: new Set(), skills: new Set(), agents: new Set(), hooks: new Set() };

  // Always-installed components
  components.rules.add('common');
  components.skills.add('coding-standards');
  components.skills.add('security-review');
  components.skills.add('tdd-workflow');
  components.skills.add('strategic-compact');
  components.skills.add('search-first');
  components.skills.add('verification-loop');
  components.agents.add('planner');
  components.agents.add('architect');
  // ... etc

  // Stack-conditional components
  if (stackConfig.backend?.language === 'typescript') {
    components.rules.add('typescript');
    // ...
  }
  // ... full mapping per spec section 2.3
}
```

The mapping data should live in a separate JSON file (`src/component-map.json`) so it can be updated easily without changing code logic.

### Phase 4: Terminal UI

**`src/prompt-ui.js`** — Zero-dependency terminal UI:

Must implement these components using raw ANSI escape codes and Node.js readline:
- `multiSelect(title, options)` → arrow keys to move, space to toggle, enter to confirm
- `singleSelect(title, options)` → arrow keys to move, enter to select
- `textInput(prompt, defaultValue)` → pre-filled text, enter to confirm, type to override
- `confirm(message)` → Y/n prompt
- `progressBar(steps)` → returns `{ advance(label), complete() }`
- `banner()` → RapidX ASCII art welcome
- `section(title)` → section header with box drawing chars
- `summary(data)` → formatted installation summary

Key requirements:
- Handle terminal resize gracefully
- Support both macOS/Linux and Windows terminals
- Clear previous selections when re-rendering
- Show cursor position clearly
- Support Ctrl+C to abort at any point

### Phase 5: Interactive installer (main flow)

**`bin/install.js`** — Wire everything together per spec section 2.2:

1. Parse CLI flags. If non-interactive flags present, skip prompts (spec section 2.6)
2. Show banner
3. Run `detectPlatforms()` → display results
4. If interactive: run platform multi-select (pre-select detected)
5. If VS Code detected without Copilot extension: print install instructions
6. Run `detectStack()` → auto-fill known versions
7. Run tech stack questionnaire (spec section 2.2 step 3):
   - Frontend: framework, version (pre-filled if detected), UI library, state management
   - Backend: language + framework, version (pre-filled), API style
   - Database: primary DB, version, ORM, cache
   - Infrastructure: cloud, containers, CI/CD
   - Testing: frameworks
   - Mobile: framework (optional)
8. Ask installation scope (global/local/both)
9. Ask client profile selection
10. Run `mapComponents(stackSelections)` → show installation plan with what will install and what will skip
11. Confirm with user
12. Run per-platform installers for each selected platform
13. Save stack config to `.rapidx/stack.json`
14. Load profile and generate CLAUDE.md, AGENTS.md, copilot-instructions.md
15. Run verification
16. Print quick-start guide

### Phase 6: Per-platform installers

Build one installer module per platform. Each reads the mapped components and copies only the relevant files.

**`src/install-claude.js`** — Claude Code:
- Copy GTD commands to `.claude/commands/gsd/`
- Copy RapidX commands to `.claude/commands/rapidx/`
- Copy selected rules to `.claude/rules/` (if rule files supported) or embed in CLAUDE.md
- Configure hooks in `.claude/settings.json`
- Generate CLAUDE.md with tech stack context and version-specific guidance

**`src/install-vscode.js`** — VS Code + GitHub Copilot:
- Check for Copilot extensions. If missing, print install URL and ask to continue.
- Generate `.github/copilot-instructions.md` — this is the main file Copilot reads. Must include: profile summary, active coding standards, tech stack with versions, version-specific guidance ("use React 18 patterns, not React 19"), active skills as context.
- Merge into `.vscode/settings.json` — read existing file, add RapidX-specific keys under a `"rapidx"` namespace, write back. Never overwrite non-RapidX keys.
- Generate `.vscode/extensions.json` with recommended extensions: `github.copilot`, `github.copilot-chat`
- Generate AGENTS.md at project root (Copilot can read this)
- Create `.github/copilot/` directory with skill reference files if Copilot supports custom prompts

**`src/install-cursor.js`** — Cursor IDE:
- Copy selected rules to `.cursor/rules/` with YAML frontmatter format conversion
- Copy hooks via adapter pattern to `.cursor/hooks/`
- Copy selected skills to `.cursor/skills/`
- Generate `.cursor/mcp.json`
- Generate AGENTS.md at project root

**`src/install-copilot-cli.js`** — GitHub Copilot CLI (standalone, not in VS Code):
- Generate `.github/copilot/instructions.md`
- Create skill reference files in `.github/copilot/skills/`

**`src/install-codex.js`** — Codex:
- Generate `.codex/config.toml`
- Generate `.codex/AGENTS.md`
- Copy selected skills to `.agents/skills/`

**`src/install-opencode.js`** — OpenCode:
- Generate `.opencode/opencode.json`
- Copy selected instructions to `.opencode/instructions/`

### Phase 7: Generators

**`src/generate-claude-md.js`** — Template-based CLAUDE.md generation:
- Reads active profile + `.rapidx/stack.json`
- Interpolates all `{{variables}}`
- Includes tech stack section with exact versions
- Includes version-specific guidance: "Use features available in {framework} {version}. Do NOT use features from newer versions."
- Lists only the skills/rules/agents that are actually installed

**`src/generate-agents-md.js`** — AGENTS.md for cross-tool compatibility:
- Universal file read by Cursor, Codex, and Copilot
- Summarizes available agents, their roles, and delegation rules
- Includes tech stack awareness

**`src/generate-copilot-instructions.js`** — `.github/copilot-instructions.md`:
- Copilot-specific format with project context
- Includes coding standards from active rules
- Includes tech stack with versions
- Includes version-specific constraints
- References skill files for detailed patterns

### Phase 8: Profile system and RapidX commands

Same as previous spec phases 4 and 5, plus:
- `/rapidx:add-tech` command that re-runs tech stack questionnaire for a new category, installs delta components, updates stack.json, regenerates all config files

### Phase 9: Integration seams and hooks

Same as previous spec phases 6 and 7, with one key change:
- All context injection (Seam 1 and 2) is filtered through the tech stack — only load rules/skills/agents matching `.rapidx/stack.json`

### Phase 10: Tests

```
tests/
├── installer/
│   ├── detect-platforms.test.js     # Mock platform detection
│   ├── detect-stack.test.js         # Parse sample package.json, go.mod, etc.
│   ├── map-components.test.js       # Verify mapping tables
│   ├── install-flow.test.js         # End-to-end installer (mocked I/O)
│   └── install-vscode.test.js       # VS Code + Copilot specific
├── profiles/
│   ├── schema-validation.test.js
│   └── profile-loading.test.js
├── hooks/
│   ├── audit-trail.test.js
│   └── secret-scanner.test.js
├── integration/
│   └── full-flow.test.js            # Install → init → plan → verify stack filtering
└── run-all.js
```

## Coding standards for this project

- **Language:** JavaScript (Node.js 18+) for all scripts and installer. Markdown for commands, agents, skills, rules.
- **Zero external npm dependencies** — Node.js built-ins only
- **JSON for configuration**, Markdown for human-readable content, JSONL for audit logs
- **Error handling everywhere** — log to stderr with `[RapidX]` prefix
- **Cross-platform paths** — `path.join()`, never hardcoded separators
- **All RapidX code in `rapidx/` subdirectories** — never mix with upstream
- **Conventional commits:** `feat(installer):`, `feat(rapidx):`, `fix(hooks):`
- **Tests use Node.js assert** — no framework
- **User-facing text: "Get Things Done"** — never the upstream name
- **VS Code settings.json merge** — read existing, add RapidX keys, write back, never overwrite
- **Component mapping in JSON** — `src/component-map.json`, not hardcoded in JS
- **Version strings in stack.json** — always semver or major.minor, never "latest"

## Architecture decisions

- Interactive installer is the primary entry point — build it first and polish it
- Only stack-relevant components are installed — never install all 108 skills
- Tech stack config saved to `.rapidx/stack.json` — single source of truth for what's installed
- VS Code + Copilot is a first-class target alongside Claude Code and Cursor
- Component mapping is data-driven (JSON file) not code-driven — easy to extend for new frameworks
- Version-specific guidance in generated configs — agents must not suggest features from newer versions
- `copilot-instructions.md` is the primary config surface for VS Code users
- Settings.json files are always merged, never overwritten
- `/rapidx:add-tech` enables incremental stack expansion without reinstalling

## What to build first

Start with Phase 1 (scaffold) → Phase 2 (detection) → Phase 3 (component mapping) → Phase 4 (terminal UI) → Phase 5 (installer flow). The installer is what users see first — it must work flawlessly. Read spec section 2 thoroughly.

## Reference links

- Get Things Done source: https://github.com/gsd-build/get-shit-done
- ECC source: https://github.com/affaan-m/everything-claude-code
- VS Code Copilot instructions: https://docs.github.com/en/copilot/customizing-copilot/adding-repository-instructions-for-github-copilot
- Cursor rules format: https://docs.cursor.com/context/rules-for-ai
