---
name: rapidx:do
description: Route freeform text to the right RapidX command automatically
argument-hint: "<description of what you want to do>"
allowed-tools:
  - Read
  - Bash
  - AskUserQuestion
---
<objective>
Analyze freeform natural language input and dispatch to the most appropriate RapidX command.

Acts as a smart dispatcher — never does the work itself. Matches intent to the best RapidX command using routing rules, confirms the match, then hands off.

Use when you know what you want but don't know which `/rapidx:*` command to run.
</objective>

<execution_context>
@~/.claude/get-things-done/workflows/do.md
@~/.claude/get-things-done/references/ui-brand.md
</execution_context>

<context>
$ARGUMENTS
</context>

<process>
Execute the do workflow from @~/.claude/get-things-done/workflows/do.md end-to-end.
Route user intent to the best RapidX command and invoke it.
</process>
