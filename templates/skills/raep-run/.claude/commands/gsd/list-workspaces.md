---
name: gsd:list-workspaces
description: List active Get Things Done workspaces and their status
allowed-tools:
  - Bash
  - Read
---
<objective>
Scan `~/gsd-workspaces/` for workspace directories containing `WORKSPACE.md` manifests. Display a summary table with name, path, repo count, strategy, and Get Things Done project status.
</objective>

<execution_context>
@~/.claude/get-things-done/workflows/list-workspaces.md
@~/.claude/get-things-done/references/ui-brand.md
</execution_context>

<process>
Execute the list-workspaces workflow from @~/.claude/get-things-done/workflows/list-workspaces.md end-to-end.
</process>
