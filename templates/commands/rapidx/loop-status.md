---
name: rapidx:loop-status
description: Read-only status board for the active /rapidx:loop autonomous build
allowed-tools:
  - Read
  - Bash
---

<objective>
Give the user a single, accurate snapshot of an autonomous `/rapidx:loop`
build's progress, without changing any state — safe to run at any time,
including mid-phase.
</objective>

<process>
1. Read `.rapidx/loop/manifest.json`. If missing, tell the user no
   `/rapidx:loop` build is initialized yet (recommend `/rapidx:loop`) and
   stop.

2. Report `spec_frozen` — if `false`, tell the user the build hasn't been
   frozen yet and point at Step 2 of `/rapidx:loop` (the clarify-and-freeze
   gate).

3. If frozen, read `.rapidx/loop/spec.md` (confirm it exists),
   `.rapidx/loop/architecture.md`, and `.rapidx/loop/plan.md` for context,
   then render a table of every phase in `manifest.json`: phase id | name |
   status (`pending`/`in_progress`/`verified`/`blocked`).

4. If any phase is `blocked`, surface its escalation reason from the most
   recent `.rapidx/loop/audit/loop-*.jsonl` entry for that phase, and the
   corresponding `.rapidx/loop/execution/phase-<N>.md` if present.

5. Summarize: phases verified / total, current phase, whether the build is
   actively progressing or waiting on a human decision, and the single
   recommended next action (re-run `/rapidx:loop` to resume, or resolve the
   specific blocker described).

6. Make sure the live dashboard is reachable and report its URL alongside
   the summary above, in case the user closed the original tab: run
   `node .rapidx/loop/dashboard/launch.js` (Bash, **no** `--open` — this
   command must not pop a new browser tab on every status check; it only
   starts the server if it isn't already running and prints the URL).

Never modify any file in `.rapidx/loop/` other than the dashboard's own
`dashboard/.state.json` bookkeeping file (written by `launch.js`, not by
this command directly) — this command's own job is read-only reporting.
</process>
</output>
