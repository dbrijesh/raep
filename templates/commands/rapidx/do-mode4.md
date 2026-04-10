---
name: rapidx:do-mode4
description: "Autonomous execution — full autopilot. Plans, executes, resolves blockers, verifies, and commits without human checkpoints."
argument-hint: "<task or feature description> [--dry-run] [--from-spec <id>] [--max-retries N]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
---

<objective>
Mode 4: Fully Autonomous Execution.

The agent takes complete ownership of the task from description to verified, committed completion. No human checkpoints during execution. Blockers are resolved autonomously with logged decisions. Runs until done, or until it encounters a hard stop condition requiring human input.

**Autonomy level:** Maximum — agent plans, executes, resolves, verifies, and commits.
**Best for:** Well-understood tasks, trusted codebase with a passing test suite, CI pipeline in place, time-sensitive delivery, batch work while the human is away.

Hard stop conditions (agent pauses and waits for human):
  - Destructive operation required: drop table, delete files, force push, rewrite history
  - Credentials or external secrets needed
  - Genuinely ambiguous requirement that cannot be safely assumed
  - Test suite still failing after `--max-retries` auto-fix attempts (default: 3)
  - Any risk classified as CRITICAL in the internal risk model

All decisions, actions, retries, and escalations are logged to:
  `.rapidx/audit/mode4-<ISO-timestamp>.jsonl`

Flags:
  `--dry-run`         Plan only — print everything that would be executed, make no changes
  `--from-spec <id>`  Load task from a RapidX spec file (specs/<id>.md) instead of free text
  `--max-retries N`   Override auto-fix retry limit (default: 3)
</objective>

<process>
## Step 0 — Safety pre-flight

Before doing anything else:

1. Read `.rapidx/stack.json` and `.planning/STATE.md`.
2. Evaluate the task description against the following STOP list:
   - Does it involve dropping or truncating database tables or collections?
   - Does it involve deleting or overwriting files not created in this session?
   - Does it involve rewriting git history (rebase, amend, force-push)?
   - Does it involve modifying authentication, payments, or compliance systems?

If ANY item on the STOP list matches: pause, describe the specific concern, and ask for explicit human authorization before proceeding. Log the escalation.

3. If `--dry-run`: set DRY_RUN=true. All write/edit/bash operations will be printed but not executed.

4. If `--from-spec <id>`: read `specs/<id>.md` and use it as the authoritative task description.

5. Initialize audit log: `.rapidx/audit/mode4-<ISO-timestamp>.jsonl`
Log: `{ "event": "start", "task": "<description>", "flags": {...}, "timestamp": "..." }`

## Step 1 — Autonomous planning

Decompose the task into atomic sub-tasks. For each:
- ID, description, affected files
- Dependencies on other sub-tasks
- Risk classification: `low` | `medium` | `high` | `critical`
- Rollback strategy

If any sub-task is classified `critical`: escalate to human immediately. Do not plan further until authorization received.

Group into dependency-ordered waves. Log the full plan to the audit log.

If `--dry-run`: print the full plan and stop. Exit with a summary of what would have been done.

## Step 2 — Wave execution (autonomous loop)

For each wave, repeat:

### 2a — Spawn subagents

Spawn one Task subagent per sub-task in the wave with a complete, self-contained execution prompt. Each subagent:
- Reads necessary context files
- Implements the sub-task
- Runs applicable unit tests for its scope
- Writes result to `.planning/rapidx-mode4/wave-N-task-X.md`

### 2b — Auto-resolve failures

On subagent failure, attempt auto-resolution up to `--max-retries` times:
- Read the error output
- Identify root cause
- Produce and apply a targeted fix
- Re-run the subagent

Log each retry attempt: `{ "event": "retry", "task": "...", "attempt": N, "error": "..." }`

After max retries exhausted on a task:
- Log: `{ "event": "blocked", "task": "...", "final_error": "..." }`
- Record the task as SKIPPED with reason
- Continue with remaining waves (do NOT abort the full session for a single task failure)

### 2c — Destructive operation guard

If a subagent reports that a destructive operation is required:
- Pause the entire session
- Log: `{ "event": "escalation", "task": "...", "reason": "..." }`
- Present the destructive operation details to the human
- Wait for explicit authorization before resuming

Update `.planning/rapidx-mode4/state.json` after each wave completes.

## Step 3 — Autonomous verification

After all waves complete:

1. Run full test suite
2. Run linter / type-checker (if configured in tech stack)
3. On failures: apply targeted auto-fixes, re-run (up to `--max-retries` attempts)
4. If still failing after max retries: STOP, escalate with full failure context

Log verification result: `{ "event": "verification", "tests": N, "passed": N, "failed": N }`

## Step 4 — Commit and completion report

If `--dry-run`: skip commit, print what would have been committed.

Otherwise: create a conventional commit with auto-generated message:
```
feat(<scope>): <one-line summary of task>

Co-authored by RapidX Mode 4 (autonomous)
Audit log: .rapidx/audit/mode4-<timestamp>.jsonl
```

Print final autonomous execution report:

```
RapidX Mode 4 — Autonomous Execution Complete

  Task:          <description>
  Duration:      Xm Ys
  Waves:         N
  Sub-tasks:     M completed, K skipped (see blockers below)
  Files changed: X
  Commits:       1 (conventional commit)
  Tests:         ✓ N passing

  Escalations during run:    0
  Auto-resolved failures:    K (N retries)

  Skipped (require manual resolution):
    task-4  — <reason>
    task-7  — <reason>

  Full audit log:  .rapidx/audit/mode4-<timestamp>.jsonl
  Session state:   .planning/rapidx-mode4/state.json
```

If any sub-tasks were skipped: recommend running `/rapidx:do-mode2` for those specific items with full human oversight.
</process>
