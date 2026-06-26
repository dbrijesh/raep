---
name: rapidx:understand-anything-domain
description: "Extract and visualize business domain knowledge and process flows from the codebase"
argument-hint: "[--full]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
---

<objective>
Extract business domain knowledge — domains, business flows, process steps — from the codebase and produce an interactive domain graph in `.understand-anything/domain-graph.json`.
</objective>

<context>
Extracts business logic (not just code structure) to show how the system implements business processes:
- If knowledge graph exists: derives domain from graph (fast)
- If not: performs lightweight scan (file tree + entry point detection + code sampling)
- Use `--full` to force fresh scan even if graph exists

Produces a domain-graph.json visible in the dashboard's domain view.
</context>

<process>
Follow all instructions from the Understand-Anything understand-domain skill:

1. Set PROJECT_ROOT (current directory, with git worktree detection)
2. Resolve plugin root via `~/.understand-anything-plugin` or search chain
3. Check for existing knowledge graph at `.understand-anything/knowledge-graph.json`
   - If exists and no `--full`: derive domain from graph (Phase 3→4)
   - If not or `--full`: run lightweight scan (Phase 2→4)
4. Lightweight scan path:
   - Run `python "$PLUGIN_ROOT/skills/understand-domain/extract-domain-context.py" "$PROJECT_ROOT"`
   - This outputs `.understand-anything/intermediate/domain-context.json`
5. Dispatch domain-analyzer subagent with context
6. Agent writes domain-analysis.json to intermediate directory
7. Validate and save to `.understand-anything/domain-graph.json`
8. Auto-launch `/rapidx:understand-anything-dashboard`
</process>
