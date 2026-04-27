---
name: rapidx:explore
description: Socratic ideation and idea routing — think through ideas before committing to plans
allowed-tools:
  - Read
  - Write
  - Bash
  - Grep
  - Glob
  - Task
  - AskUserQuestion
---
<objective>
Open-ended Socratic ideation session. Guides the developer through exploring an idea via
probing questions, optionally spawns research, then routes outputs to the appropriate RapidX
artifacts (notes, todos, seeds, research questions, requirements, or new phases).

Accepts an optional topic argument: `/rapidx:explore authentication strategy`
</objective>

<execution_context>
@~/.claude/get-things-done/workflows/explore.md
</execution_context>

<process>
Execute the explore workflow from @~/.claude/get-things-done/workflows/explore.md end-to-end.
</process>
