---
name: rapidx:do-mode2
description: "Structured execution — human drives, AI co-pilots. Explicit approval required at every gate before any action."
argument-hint: "<task or feature description>"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

<objective>
Mode 2: Structured Human-Driven Execution.

You are in the driver's seat. The agent prepares, proposes, and validates — you explicitly approve every gate before execution proceeds. Nothing runs without your sign-off.

**Autonomy level:** Low — human validates every step.
**Best for:** High-stakes changes, regulated environments, unfamiliar codebases, onboarding, pair-programming sessions, any change where you want full visibility and control.

Gates requiring explicit approval before proceeding:
  1. Task understanding — did AI interpret your intent correctly?
  2. Decomposition — what sub-tasks will be run?
  3. Plan per sub-task — exactly what will change?
  4. Post-task diff review — accept each completed sub-task?
  5. Final verification — accept all changes?

Commands during execution:
  `approve`  — proceed to next gate
  `revise`   — rework the current step
  `skip`     — skip current sub-task
  `stop`     — abort and roll back uncommitted changes
</objective>

<process>
## Gate 0 — Interpret intent

Load project context:
- `.planning/STATE.md` (current project state, if exists)
- `.rapidx/stack.json` (tech stack and installed components)
- `.planning/ROADMAP.md` (current phase, if exists)

Restate the task in plain English. Include:
- What you understood the user wants
- Which areas of the codebase are likely affected
- Any assumptions you are making

Ask the user:
"**Gate 0:** Does this match your intent?
  → `approve` to continue | `revise <correction>` to adjust"

Do not proceed until the user explicitly approves.

## Gate 1 — Decomposition

Break the task into atomic, independently executable sub-tasks. For each sub-task:
- **ID:** task-N
- **What:** one-sentence description
- **Files affected:** list the expected files
- **Risk:** `low` | `medium` | `high` + one-line rationale

Display as a numbered list. Show estimated total sub-tasks.

Ask the user:
"**Gate 1:** Does this decomposition look right?
  → `approve` | `add <task>` | `remove <N>` | `revise <N> <change>`"

Do not proceed until approved. Incorporate any changes the user requests.

## Gate 2 — Plan for sub-task 1

Show progress marker: `[Sub-task 1 / N]`

Produce a detailed plan for sub-task 1 only:
- Exact edits per file (function names, line ranges if known)
- New files or directories to create
- Commands to run (tests, builds, linters, migrations)
- Rollback plan if this sub-task fails

Ask the user:
"**Gate 2 [task-1]:** Ready to execute?
  → `approve` | `revise <change>`"

## Gate 3 — Execute sub-task 1

Execute the approved plan. Use only the tools listed in `allowed-tools`.

After completion, produce a compact diff summary:
```
Changed:  src/auth/login.ts (+24 -8)
Created:  src/auth/session.ts (+62)
Deleted:  (none)
Ran:      npm test -- --testPathPattern=auth (12 passed, 0 failed)
```

Ask the user:
"**Gate 3 [task-1 complete]:** Accept this change?
  → `approve next` | `revise` (re-run this sub-task) | `skip next` | `stop`"

If `revise`: undo the changes (restore files), go back to Gate 2 for this sub-task.
If `stop`: restore all uncommitted files and exit.

## Gate 4 — Repeat for remaining sub-tasks

For each remaining sub-task, show:
`[Sub-task N / Total]` then repeat Gates 2–3.

Maintain a running log of completed sub-tasks and their status.

## Gate 5 — Verification

Run the full test suite and any configured linters.
Produce a final summary:

```
RapidX Mode 2 — Structured Execution Complete

  Sub-tasks:     N completed, M skipped
  Files changed: X
  Tests:         ✓ passing / ✗ N failures
  
  All changes committed: no — awaiting your final approval
```

Ask the user:
"**Gate 5 [final]:** Accept all changes?
  → `approve` (commit) | `revise <task-number>` (rework a sub-task) | `stop` (discard all)"

Only commit after explicit final approval.
</process>
