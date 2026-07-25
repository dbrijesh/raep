---
name: rapidx:loop
description: Autonomous intent → implementation → verification loop — one requirements freeze, then continuous phase-by-phase build with no human gates
argument-hint: "[--source <path>] [--requirements <path>] [--target <dir>] [--max-retries N]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Task
---

<objective>
Drive a `workflow-modernization`-profile engagement autonomously: intake
(comprehend a legacy Appian/Pega/BAW/MuleSoft app, or ingest a
`requirements.md`) → research + clarifying questions → **one** upfront
freeze of requirements and acceptance criteria → continuous, non-stopping,
phase-by-phase build with end-of-phase self-verification, targeting the
same architecture family as the gated `workflow-modernize` pipeline but
**generating every file fresh** — never stamping or copying from
`templates/workflow-platform-scaffold/` or `reference-implementation/`.
See `workflow-loop-build-patterns` for the full "reference, never copy"
rule and the cross-cutting-services-as-sidecars rule.

This is the autonomous counterpart to `/rapidx:workflow-modernize`: that
command pauses at 3 review gates (reimagine/blueprint/parity); this command
pauses at exactly 1 (the requirements freeze), then runs to completion or a
hard-stop escalation.
</objective>

<process>
## Step 0 — Preconditions and live dashboard

1. Confirm the active profile is `workflow-modernization` (check
   `.rapidx/stack.json`). If not, tell the user to reinstall/switch profile
   before continuing — `.rapidx/loop/` and the `loop-*` agents won't be
   present otherwise.
2. Confirm `.rapidx/loop/manifest.json` exists (seeded by the installer). If
   `spec_frozen` is already `true` from a prior run, ask whether to resume
   the existing build (skip to Step 3) or start a new engagement (archive
   the existing `.rapidx/loop/` contents first — never silently overwrite a
   frozen spec).
3. Launch the live progress dashboard now, before intake begins, so it is
   already open by the time the pipeline starts producing output: run
   `node .rapidx/loop/dashboard/launch.js --open` (Bash). This starts a
   zero-dependency local Node server (default `http://localhost:4747`, next
   free port if taken) as a detached background process — safe to re-run,
   it no-ops if a dashboard is already live — and opens it in the default
   browser. Tell the user the printed URL immediately: this page updates
   itself in real time as every later step runs, in plain language a
   non-technical stakeholder can follow, so they don't have to watch this
   conversation to track progress. The dashboard's "Tokens Used" counter is
   populated automatically by the `token-tracker` hook (reads the session
   transcript after every tool call) — nothing to do here, just be aware
   it needs that hook installed (it is, by default, for this profile).
4. This command is designed to run phases 2-4 without pausing for tool
   confirmation on every file write/edit/command. If Claude Code is running
   in its default permission mode, expect a confirmation prompt on every
   individual edit and Bash call throughout the build — that is Claude
   Code's normal safety behavior, not a bug in this pipeline, and this
   command does not (and should not) silently change it. If you want the
   phase-build step to actually run unattended once you've confirmed the
   frozen spec in Step 2, switch Claude Code to an elevated permission mode
   (e.g. "accept edits" or a full permissions-bypass mode) for this session
   before continuing — that is a deliberate choice you make, not something
   this command configures for you.

## Step 1 — Intake (identical to the gated pipeline)

Route on arguments, exactly as `/rapidx:workflow-modernize` does. Neither
`workflow-comprehend` nor `workflow-intake-requirements` emits dashboard
progress events on its own (they're shared with the gated pipeline, which
has no dashboard) — this command supplies that narration itself so the
dashboard doesn't go quiet during intake:

- **[progress]** Before delegating, append a
  `{loop_stage:"intent", stage:"intake", status:"started", level:"info",
  message:"..."}` line to `.rapidx/loop/progress.jsonl` describing which
  path was chosen in plain language: "Reading the legacy application to
  understand its workflows…" for the comprehend path, or "Reading your
  requirements document…" for the requirements path.
- `--source <path>` present → delegate to `/rapidx:workflow-comprehend --source <path>`.
- `requirements.md` already exists at
  `.rapidx/migration/requirements/requirements.md` (or `--requirements <path>`
  passed) → delegate to `/rapidx:workflow-intake-requirements`.
- Neither present → ask the user which path applies.
- **[progress]** After the delegated command's own "Report:" summary comes
  back, append a `{loop_stage:"intent", stage:"intake", status:"done",
  level:"success", message:"..."}` line summarizing what intake found in
  plain language (e.g. "Found 3 processes and 12 form fields — moving on to
  clarifying questions."), with the delegated command's technical summary
  in `detail`. This keeps the "why is it calling workflow-intake-requirements"
  step visible on the dashboard instead of feeling like an opaque detour —
  it's the same intake logic the gated pipeline uses (so both entry points
  stay consistent), just narrated here since the shared intake commands
  themselves don't know about the dashboard.

## Step 2 — Clarify and freeze (the one and only stop-and-confirm gate)

Delegate to the `loop-requirements-clarifier` agent. It researches, asks
clarifying questions across UI/UX, backend service modularity, agentic
workflow requirements, and functional/non-functional gaps, then writes
`.rapidx/loop/spec.md`.

**Pause here** and present the frozen spec for explicit confirmation. Do not
proceed past this point without it — after this gate, the loop does not stop
again for design review.

## Step 3 — Architecture and phase planning

Delegate to the `loop-architecture-planner` agent. It reads the frozen spec
plus `workflow-engine-patterns` / `workflow-compliance-patterns` /
`workflow-agentic-topology-patterns` / `workflow-loop-build-patterns` as
pattern reference (never as copyable source), and writes
`.rapidx/loop/architecture.md` (service topology, cross-cutting capabilities
as standalone services/sidecars) and `.rapidx/loop/plan.md` (phase-by-phase
build plan with a mechanically-checkable Definition of Done per phase).

Report the plan to the user, then proceed immediately — no second gate.

## Step 4 — Continuous phase-by-phase build (no stopping)

Delegate to the `loop-phase-builder` agent, passing `--max-retries` if
provided (default 3). It works through every phase in `.rapidx/loop/plan.md`
in order: implement → self-verify (build-error-resolver + tests/lint per
phase's Definition of Done) → auto-fix/retry within budget → log → continue
to the next phase without pausing.

It only pauses for a STOP-list condition (destructive operation, missing
credentials, an unresolvable spec/architecture conflict, or a phase still
failing after max retries) — if that happens, present the specific
escalation to the user and wait for direction before resuming.

## Step 5 — Completion report

Once every phase in `.rapidx/loop/manifest.json` shows `verified`, report:
phases built, per-phase verification summary, any auto-fixes applied along
the way, and total escalations (0 in the common case). Point the user at
`/rapidx:loop-status` for a re-checkable summary at any time, at
`.rapidx/loop/audit/loop-*.jsonl` for the full decision trail, and at the
live dashboard URL from Step 0 — it now shows "Build complete" and stays up
so the full activity history can be reviewed after the fact.

Never skip the Step 2 freeze gate silently, and never let `loop-phase-builder`
copy code from `templates/workflow-platform-scaffold/` or
`reference-implementation/` — if either agent reports it's about to do
either of those things, that's a bug in this pipeline, not an acceptable
shortcut.
</process>
</output>
