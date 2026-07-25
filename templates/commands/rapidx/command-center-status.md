---
name: rapidx:command-center-status
description: Read-only snapshot of the RapidX Command fleet (all opted-in repos), without opening the console
allowed-tools:
  - Read
  - Bash
---

<objective>
Give the user a quick text summary of the whole fleet — every opted-in
repo's sessions, not just this one — without launching a browser tab.
</objective>

<process>
1. Check `~/.rapidx-command/.state.json`. If missing, tell the user no
   collector has been started yet (recommend `/rapidx:command-center`) and
   stop.

2. Read the `port` from that file and `GET http://127.0.0.1:<port>/api/state`
   (Bash, e.g. `curl -s http://127.0.0.1:<port>/api/state`). If the request
   fails, tell the user the collector isn't responding (it may have been
   stopped) and recommend `/rapidx:command-center` to restart it.

3. Render a table from the response: repo | agent | status | phase | last
   activity — one row per agent in `agents`.

4. Summarize the `kpis` block (agents running, awaiting you, events today,
   tokens observed) and list any open `escalations` with their questions.

5. If this repo (check `.rapidx/command/identity.json`) isn't in the
   `agents` list, mention that it hasn't opted in yet — recommend
   `/rapidx:command-center`.

Read-only — do not write to any file or call `/api/control` /
`/api/escalations/*` from this command.
</process>
