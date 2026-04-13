# Skill: Codebase Learning

**Applies to**: All platforms
**Category**: Knowledge Management
**Always installed**: Yes

## What this skill does

Teaches AI agents to learn from YOUR codebase rather than applying generic patterns. The learning system extracts project-specific conventions, architecture decisions, and domain knowledge, then injects this context into every AI interaction.

## Why this matters

Generic AI tools suggest generic patterns. RapidX agents suggest YOUR patterns — the ones already in your codebase, approved by your team, and validated by your architecture decisions.

## Learning workflow

```
Codebase / Docs / Guidelines
           ↓
    /rapidx:learn          → .rapidx/knowledge/code-patterns.md
    /rapidx:learn-arch     → .rapidx/knowledge/architecture.md
           ↓
    /rapidx:fine-tune      → Updates skills, agents, platform configs
           ↓
    /rapidx:knowledge-sync → All platforms share the same knowledge
```

## What gets learned

### 1. Code patterns (from source)
- Naming conventions (files, functions, variables, classes, tests)
- Module and folder organization
- Error handling style
- Logging patterns
- Testing conventions (test file names, describe/it structure)
- Import/export patterns
- Framework-specific idioms

### 2. Architecture (from docs + code)
- Component inventory and responsibilities
- Service integration patterns
- Accepted Architecture Decisions (ADRs)
- Deprecated patterns to avoid
- Data model conventions

### 3. Guidelines (from configs + docs)
- Linting rules (ESLint, Pylint, golangci-lint)
- Code formatting standards
- Git commit conventions
- PR review requirements
- Coverage requirements

### 4. Domain knowledge (from business logic + docs)
- Business domain model
- Key entities and their relationships
- Business rules encoded in the system
- Terminology and ubiquitous language

## Input sources

### Automatic (scanned on `/rapidx:learn`)
- All source code files
- `ARCHITECTURE.md`, `DESIGN.md`
- `docs/adr/*.md` (Architecture Decision Records)
- `CONTRIBUTING.md`, `README.md`
- `.eslintrc*`, `pyproject.toml`, `.editorconfig`

### User-provided (drop files and run `/rapidx:learn --dir`)
```
.rapidx/inputs/
├── coding-standards.pdf       # Company coding standards
├── architecture-blueprint.md  # Enterprise architecture guidelines
├── api-guidelines.md          # API design standards
├── tech-radar.md              # Technology radar / approved libraries
└── security-guidelines.md     # Security standards
```

## Fine-tuning target: Platform configs

After learning, the knowledge is written to:

| Platform | File updated |
|----------|-------------|
| Claude Code | `CLAUDE.md`, `.claude/rules/project-patterns.md` |
| VS Code Copilot | `.github/copilot-instructions.md`, `.github/copilot/skills/` |
| Cursor | `.cursor/rules/rapidx-knowledge.mdc` |
| Codex | `.codex/AGENTS.md`, `.agents/skills/coding-standards/` |
| OpenCode | `.opencode/instructions/project-knowledge.md` |

## Commands

| Command | What it does |
|---------|-------------|
| `/rapidx:learn` | Learn from codebase (code + guidelines) |
| `/rapidx:learn --docs` | Learn from documentation only |
| `/rapidx:learn --arch` | Focus on architecture artifacts |
| `/rapidx:learn --file <path>` | Learn from a specific file |
| `/rapidx:learn --dir <path>` | Learn from a directory (e.g., `.rapidx/inputs/`) |
| `/rapidx:learn-arch` | Deep architecture analysis (ADRs, diagrams) |
| `/rapidx:fine-tune` | Apply all learned knowledge to installed configs |
| `/rapidx:fine-tune --preview` | Preview changes without applying |
| `/rapidx:knowledge-sync` | Push knowledge to all platform configs |

## Agents

- `knowledge-curator` — Main learning and curation agent
- `architect` — Consumes architecture knowledge
- `code-reviewer` — Uses project patterns for review

## Hooks

- `hooks/knowledge-sync.js` — Auto-runs `/rapidx:knowledge-sync` after session end
- `hooks/codebase-context.js` — Injects current knowledge at session start
