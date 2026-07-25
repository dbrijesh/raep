---
name: rapidx:command-center
description: Opt this repo into RapidX Command — the multi-repo Claude Code fleet console (observe every session, pause/resume/kill any of them)
allowed-tools:
  - Read
  - Bash
---

<objective>
Bring up RapidX Command — a single console that watches Claude Code
sessions across every opted-in repo on this machine at once, and lets you
pause, resume, or stop any of them. This is not scoped to `/rapidx:loop`
engagements; it works for any Claude Code session in an opted-in repo.

Not profile-gated — works in any repo, on any RapidX profile.
</objective>

<process>
1. Confirm the shared home-dir install exists: check for
   `~/.rapidx-command/launch.js` (on Windows, `%USERPROFILE%\.rapidx-command\launch.js`).
   If it's missing, tell the user their RapidX install predates the command
   center and to re-run the RapidX installer, then stop.

2. Opt this repo in: run
   `node ~/.rapidx-command/init-hooks.js` (Bash) from the repo root. This
   is idempotent — safe to re-run. It:
   - Merges `command-emit`/`command-gate` hook registrations into this
     repo's `.claude/settings.json`, additively (never touches existing
     hooks or permissions).
   - Writes `.rapidx/command/identity.json` once, giving this repo a
     stable `correlation_id` so its sessions show up on the fleet wall.

3. Launch (or attach to) the shared console:
   `node ~/.rapidx-command/launch.js --open` (Bash). If a collector is
   already running (from this repo or another opted-in repo), this attaches
   to it rather than starting a second instance — the whole point is one
   wall for every concurrent repo.

4. Report the console URL, and explain to the user in plain terms:
   - **Agent wall** — every opted-in repo's sessions, grouped by repo,
     colored by status (building / verifying / escalated / silent /
     paused).
   - **Hold / Resume / Stop** — per-agent buttons, plus fleet-wide
     Hold/Stop at the top. Hold and Stop block the *next* tool call in that
     session with an instruction the agent reads and honors; Stop does
     **not** kill the underlying process (a hook can't do that) — if the
     terminal itself needs to end, the user has to do that directly.
   - **Escalation inbox** — questions agents flag via `Notification` land
     here. Answering one records an audit decision but does **not**
     auto-resume the agent yet (no `ask_operator` MCP tool in this MVP) —
     say this plainly so the user doesn't expect a hands-off unblock.

5. Remind the user this only affects *this* repo's future sessions — repos
   they want on the wall too need their own one-time
   `/rapidx:command-center` run.
</process>
