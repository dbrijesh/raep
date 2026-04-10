---
name: rapidx:learn
description: "Learn from the current codebase, documents, and guidelines to fine-tune skills, agents, and rules"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
---

<objective>
Analyze the current codebase, architecture artifacts, documentation, and any user-provided inputs to extract patterns, conventions, and domain knowledge. Save these as curated learning artifacts in `.rapidx/knowledge/` so all agents and skills automatically reflect the project's actual standards.

This is the RapidX "fine-tuning" system — the more you run it, the smarter the platform gets about YOUR codebase.
</objective>

<process>
## Step 1 — Determine learning scope from $ARGUMENTS

Parse $ARGUMENTS for scope flags:
- `--code` or `arch` → scan source code patterns
- `--docs` → scan documentation files
- `--arch` → scan architecture artifacts
- `--guidelines` → scan standards/guidelines files
- `--all` → all of the above (default if no flags)
- `--file <path>` → learn from a specific file
- `--dir <path>` → learn from a specific directory

## Step 2 — Discover learnable artifacts

Scan the project for:

### Source code patterns
```
src/**/*.{ts,js,py,go,java,cs,rs,rb,php}
lib/**/*
app/**/*
packages/**/*
services/**/*
```

Extract:
- Naming conventions (files, functions, variables, classes)
- Module/package organization patterns
- Error handling patterns
- Logging patterns
- Testing patterns (test file naming, describe/it conventions)
- API patterns (route naming, handler structure, middleware patterns)
- Database patterns (model naming, query conventions, migration patterns)
- Configuration patterns (env vars, config files)

### Architecture artifacts
```
ARCHITECTURE.md, docs/ARCHITECTURE.md
ADRs: docs/adr/*.md, decisions/*.md, architecture/decisions/*.md
diagrams: docs/diagrams/*, *.puml, *.mermaid
DESIGN.md, docs/DESIGN.md
RUNBOOK.md
```

### Documentation
```
README.md, docs/README.md
CONTRIBUTING.md
docs/**/*.md
wiki/**/*.md
```

### Guidelines and standards
```
.eslintrc*, eslint.config.*
.prettierrc*
pyproject.toml, setup.cfg (linting sections)
.editorconfig
CODING_STANDARDS.md, docs/CODING_STANDARDS.md
STYLE_GUIDE.md
```

### Existing RapidX knowledge
```
.rapidx/knowledge/*.md
.rapidx/stack.json
specs/**/*.md
```

## Step 3 — Extract patterns methodically

For each discovered artifact type, use the knowledge-curator agent pattern:

**Code pattern extraction:**
```
1. Identify the most common file structure (examine 5-10 representative files)
2. Extract: imports style, export patterns, function signatures, class patterns
3. Identify: consistent naming, folder organization, test co-location
4. Note: framework-specific conventions (React hooks pattern, Django views pattern, etc.)
5. Capture: version-specific idioms (are they using modern or legacy patterns?)
```

**Architecture pattern extraction:**
```
1. Read ARCHITECTURE.md sections: Overview, Components, Data flow, Decisions
2. Extract: service boundaries, integration patterns, data models
3. Read ADRs: what decisions were made and why
4. Note: what patterns are deprecated/not to follow
```

**Guideline extraction:**
```
1. Read linting configs: rules that are enforced
2. Read coding standards docs: explicit conventions
3. Read CONTRIBUTING.md: PR process, commit conventions
```

## Step 4 — Build knowledge artifacts

Write to `.rapidx/knowledge/`:

### `.rapidx/knowledge/code-patterns.md`
```markdown
# Code Patterns — Learned from Codebase

**Learned**: {DATE}
**Sources**: {list of files analyzed}
**Stack**: {from stack.json}

## Naming Conventions
{extracted patterns}

## Module Structure
{extracted patterns}

## Error Handling
{extracted patterns}

## Testing Patterns
{extracted patterns}

## API Patterns
{extracted patterns}

## Database Patterns
{extracted patterns}

## Anti-patterns (do NOT use)
{patterns found that are deprecated or being migrated away from}
```

### `.rapidx/knowledge/architecture.md`
```markdown
# Architecture Knowledge

**Learned**: {DATE}

## System Overview
{extracted from ARCHITECTURE.md}

## Key Components
{component descriptions and responsibilities}

## Integration Patterns
{how components communicate}

## Active Architecture Decisions
{summary of in-force ADRs}

## Deprecated Patterns
{patterns from old ADRs that are no longer valid}
```

### `.rapidx/knowledge/guidelines.md`
```markdown
# Project Guidelines

**Learned**: {DATE}

## Code Style
{from linting configs and style guides}

## Git & PR Conventions
{from CONTRIBUTING.md}

## Testing Requirements
{coverage targets, test types required}

## Documentation Standards
{comment requirements, doc update requirements}
```

### `.rapidx/knowledge/domain.md`
```markdown
# Domain Knowledge

**Learned**: {DATE}

## Business Domain
{extracted from README, docs, specs}

## Key Entities
{domain objects, their relationships}

## Domain Rules
{business rules extracted from code/docs}

## Terminology
{project-specific terms and definitions}
```

## Step 5 — Update installed skills and agents

After building knowledge artifacts, update the context for installed components:

1. Regenerate `CLAUDE.md` section: "Project-Specific Patterns"
2. Append learned patterns to `coding-standards` skill
3. Update `architect` agent with architecture knowledge
4. Update `code-reviewer` agent with project-specific patterns

## Step 6 — Output summary

```
RapidX Knowledge Update Complete

  Artifacts analyzed: {N} files
  Patterns extracted: {N}
  Knowledge files updated:
    .rapidx/knowledge/code-patterns.md   ✓
    .rapidx/knowledge/architecture.md    ✓
    .rapidx/knowledge/guidelines.md      ✓
    .rapidx/knowledge/domain.md          ✓

  Agents updated: architect, code-reviewer, planner
  CLAUDE.md: updated with project patterns

  Next:
    /rapidx:learn --docs      → Learn from documentation
    /rapidx:learn-arch        → Deep architecture analysis
    /rapidx:fine-tune         → Apply learned patterns to skills
    /rapidx:knowledge-sync    → Sync to all platform configs
```
</process>
