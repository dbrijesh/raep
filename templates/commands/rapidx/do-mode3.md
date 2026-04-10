---
name: rapidx:do-mode3
description: "Orchestrated execution — subagents run tasks in parallel waves, human reviews at each wave boundary."
argument-hint: "<task or feature description> [--waves N] [--resume]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
  - AskUserQuestion
---

<objective>
Mode 3: Orchestrated Execution.

The orchestrator decomposes the task, resolves dependencies, groups work into parallel waves, and spawns one subagent per task. Sub-tasks within the same wave run concurrently. Human reviews the wave summary and approves continuation — not each individual task.

**Autonomy level:** Medium — agents coordinate, human reviews at wave boundaries.
**Best for:** Medium-to-large features, tasks with clear parallelizable work, refactors across many files, cases where you want speed with oversight at natural checkpoints.

Checkpoints:
  - Wave summary after each wave completes (human approves to continue)
  - Blocker escalation if a subagent hits an unresolvable issue
  - Final verification report before marking complete

Flags:
  `--waves N`   Max parallel subagents per wave (default: auto by dependency graph)
  `--resume`    Resume from a previously paused Mode 3 session (reads .planning/rapidx-orchestrate/state.json)

Commands at wave boundaries:
  `continue`   — execute next wave
  `pause`      — save state, stop (resumable with --resume)
  `revise`     — modify remaining tasks before next wave
  `stop`       — abort and report what was completed
</objective>

<process>
## Step 1 — Initialize

Load context:
- `.planning/STATE.md` — current project state
- `.rapidx/stack.json` — tech stack
- `.planning/ROADMAP.md` — current milestone/phase if applicable

If `--resume` flag: read `.planning/rapidx-orchestrate/state.json`. Display resumed session info and skip to the next incomplete wave.

Create session state file: `.planning/rapidx-orchestrate/state.json`
```json
{
  "session_id": "<uuid>",
  "task": "<description>",
  "started_at": "<ISO timestamp>",
  "waves": [],
  "status": "running"
}
```

## Step 2 — Task decomposition and wave planning

Analyze the task and produce an exhaustive sub-task list. For each sub-task:
- ID, description, affected files
- Dependencies (which other sub-task IDs must complete first)
- Estimated risk: `low` | `medium` | `high`

Topologically sort sub-tasks by dependencies into waves:
- Wave 1: all tasks with no dependencies
- Wave 2: tasks whose dependencies are in Wave 1
- Wave N: tasks whose dependencies are all in earlier waves

If `--waves N` specified: cap maximum concurrent sub-tasks per wave at N.

Display the wave plan before execution:
```
Orchestration Plan — 3 waves, 7 sub-tasks

  Wave 1 (parallel ×3):
    task-1  Create database schema migration
    task-2  Add API route stubs
    task-3  Write unit test scaffolding

  Wave 2 (parallel ×2):
    task-4  Implement service layer (depends: task-1, task-2)
    task-5  Wire test cases to implementation (depends: task-3)

  Wave 3 (sequential):
    task-6  Integration test pass
    task-7  Update API documentation
```

Ask the user:
"**Orchestration plan ready.** Proceed with Wave 1?
  → `continue` | `revise <task-id> <change>` | `stop`"

## Step 3 — Execute waves

For each wave:

### 3a — Spawn subagents

For each sub-task in the current wave, spawn a Task subagent with a self-contained prompt:
- Full task specification
- List of files to read for context
- Expected output artifacts
- Output path: `.planning/rapidx-orchestrate/wave-N-task-X.md`

Subagent output format (written to output path):
```
status: success | failed | blocked
files_changed: [list]
summary: <what was done>
blocker: <if blocked, explain why>
```

### 3b — Collect results

Wait for all subagents in the wave to complete.

Read all output files. Classify results:
- `success` — completed normally
- `failed` — error after exhausting retries (auto-retry up to 2 times per subagent)
- `blocked` — requires human input (credentials, ambiguous requirement, destructive op)

Update `.planning/rapidx-orchestrate/state.json` with wave results.

### 3c — Wave summary + checkpoint

Display wave results:
```
Wave N complete — 3 succeeded, 0 failed, 1 blocked

  ✓ task-1  Created migration 0042_add_sessions.sql
  ✓ task-2  Added POST /auth/session route
  ✓ task-3  Scaffolded 14 unit tests
  ⚠ task-4  BLOCKED — requires database credentials for migration test
             Resolution needed: set DB_URL in .env.test

Remaining: 3 tasks in 2 waves
```

For BLOCKED tasks: present the blocker and ask for resolution input.
After user resolves blockers: mark the task as ready and re-queue for next wave.

Ask the user:
"**Wave N checkpoint.** Continue to Wave N+1?
  → `continue` | `pause` (saves state) | `revise <task-id>` | `stop`"

If `pause`: write current state to `.planning/rapidx-orchestrate/state.json` with status `paused`. Exit cleanly.

## Step 4 — Final verification

After all waves complete, run the full test suite and linter.

Produce final orchestration report:
```
RapidX Mode 3 — Orchestrated Execution Complete

  Session:       <session_id>
  Duration:      Xm Ys
  Waves:         N completed
  Sub-tasks:     M succeeded, K failed, J blocked
  Files changed: X across Y modules

  Blocked tasks (require manual resolution):
    task-4: <reason>

  Tests: ✓ passing / ✗ N failures

  State saved to: .planning/rapidx-orchestrate/state.json
```

If tests fail: ask user whether to attempt auto-fix or leave for manual resolution.
</process>
