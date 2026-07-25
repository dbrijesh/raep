---
name: rapidx:understand-anything
description: "Analyze codebase and build an interactive knowledge graph (powered by Understand-Anything)"
argument-hint: "[path] [--full|--auto-update|--no-auto-update|--review|--language <lang>]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
---

<objective>
Use the Understand-Anything engine to analyze this codebase and produce a knowledge graph at `.understand-anything/knowledge-graph.json`. The graph enables architectural visualization, semantic search, guided tours, and diff impact analysis.
</objective>

<context>
Understand-Anything is installed at `~/.understand-anything-plugin`. Skills are at `~/.claude/skills/understand/SKILL.md` (Claude Code) or the platform-equivalent path.

The analysis runs 7 phases:
- Phase 0: Pre-flight (incremental vs full detection)
- Phase 0.5: Ignore configuration (.understandignore)
- Phase 1: Scan (file inventory, languages, frameworks)
- Phase 1.5: Batch computation
- Phase 2: Analyze (AI-powered per-file semantic analysis, up to 5 concurrent)
- Phase 3: Assemble review
- Phase 4: Architecture (layer identification)
- Phase 5: Tour (guided walkthrough)
- Phase 6: Review (validation)
- Phase 7: Save + launch dashboard
</context>

<process>
Follow all instructions in the Understand-Anything understand skill. The full instructions are in the SKILL.md file installed at your skills directory.

1. Resolve PROJECT_ROOT from $ARGUMENTS (non-flag token = directory path) or use CWD
2. Check for git worktree — redirect to main repo root if needed
3. Ensure `~/.understand-anything-plugin` is installed and core is built
4. Run Phase 0 through Phase 7 per the skill instructions
5. After successful completion, automatically launch `/rapidx:understand-anything-dashboard`

If `~/.understand-anything-plugin` is not installed, tell the user to run the RapidX installer with `npx rapidx-platform` to install Understand-Anything, or clone it manually:

```bash
git clone https://github.com/Egonex-AI/Understand-Anything.git /tmp/ua \
  && cp -r /tmp/ua/understand-anything-plugin ~/.understand-anything-plugin \
  && cd ~/.understand-anything-plugin \
  && pnpm install \
  && pnpm --filter @understand-anything/core build
```
</process>
