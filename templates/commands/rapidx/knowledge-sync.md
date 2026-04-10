---
name: rapidx:knowledge-sync
description: "Sync all RapidX knowledge and fine-tuning to every installed platform config"
allowed-tools:
  - Read
  - Write
  - Bash
---

<objective>
Propagate the current state of `.rapidx/knowledge/` to every installed platform's configuration files. Run this after any `/rapidx:learn`, `/rapidx:learn-arch`, or `/rapidx:fine-tune` to ensure all AI tools (Claude Code, Copilot, Cursor, Codex, OpenCode) have the same up-to-date project knowledge.
</objective>

<process>
## Step 1 — Inventory installed platforms

Read `.rapidx/stack.json` → `installed_platforms` field.
Check which platform config directories exist:
- `.claude/` → Claude Code
- `.github/copilot-instructions.md` → VS Code Copilot
- `.cursor/` → Cursor
- `.codex/` → Codex
- `.opencode/` → OpenCode
- `.agents/` → Codex/Antigravity

## Step 2 — Load all knowledge

Read `.rapidx/knowledge/*.md` and merge into a unified context block:

```markdown
<!-- RapidX Knowledge Block — auto-generated {DATE} — do not edit manually -->
<!-- Run /rapidx:learn to refresh, /rapidx:knowledge-sync to re-sync -->

## Project Patterns (from codebase analysis)
{code-patterns.md summary}

## Architecture Context
{architecture.md summary}

## Project Guidelines
{guidelines.md summary}

## Domain Knowledge
{domain.md summary}
<!-- END RapidX Knowledge Block -->
```

## Step 3 — Sync per platform

### Claude Code
- Update `CLAUDE.md`: Replace existing `<!-- RapidX Knowledge Block -->` section or append
- Update `.claude/rules/project-patterns.md` with code patterns

### VS Code Copilot
- Update `.github/copilot-instructions.md`: Replace/append knowledge block
- Update `.github/copilot/skills/` skill files with new patterns

### Cursor
- Create/update `.cursor/rules/rapidx-knowledge.mdc`:
  ```yaml
  ---
  description: RapidX auto-learned project patterns (run /rapidx:learn to refresh)
  alwaysApply: true
  ---
  {knowledge block}
  ```

### Codex
- Update `.codex/AGENTS.md` with project knowledge
- Update `.agents/skills/coding-standards/` with project patterns

### OpenCode
- Update `.opencode/instructions/project-knowledge.md` with knowledge block

### Antigravity
- Update `.agent/instructions.md` if it exists

## Step 4 — Generate sync report

Write `.rapidx/knowledge/SYNC_LOG.md`:
```markdown
# Knowledge Sync Log

| Date | Event | Sources | Platforms |
|------|-------|---------|-----------|
| {DATE} | Sync | {N} knowledge files | {platform list} |
```

## Step 5 — Output

```
Knowledge Sync Complete — {DATE}

  Knowledge files: {N}
  
  Platforms updated:
    Claude Code     ✓  (CLAUDE.md + rules/)
    VS Code Copilot ✓  (copilot-instructions.md + skills/)
    Cursor          ✓  (.cursor/rules/rapidx-knowledge.mdc)
    Codex           ✓  (.codex/AGENTS.md)
    OpenCode        ✓  (.opencode/instructions/)

  All AI tools now share the same project knowledge.

  Refresh knowledge: /rapidx:learn --all
```
</process>
