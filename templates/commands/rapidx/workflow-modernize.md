---
name: rapidx:workflow-modernize
description: Top-level orchestrator for a legacy workflow (Pega/BAW/Appian/MuleSoft) modernization engagement
allowed-tools:
  - Read
  - Write
  - Bash
  - Task
---

<objective>
Drive a `workflow-modernization` engagement end-to-end through the four
stages (Comprehend → Reimagine → Blueprint → Forward-Engineer), routing to
whichever intake path applies and pausing at each review gate. See the
`workflow-modernization-method` skill for the full method.
</objective>

<process>
1. Confirm the active profile is `workflow-modernization` (check
   `.rapidx/stack.json`). If not, tell the user to reinstall/switch profile
   (`/rapidx:switch-client` or reinstall with `--profile workflow-modernization`)
   before continuing — the required agents/skills/state directory won't be
   present otherwise.

2. **Route on intake path**, based on arguments:
   - `--source <path>` present → delegate to `/rapidx:workflow-comprehend --source <path>`.
   - `requirements.md` already exists at `.rapidx/migration/requirements/requirements.md`
     (or a path passed via `--requirements <path>`) → delegate to
     `/rapidx:workflow-intake-requirements`.
   - Neither present → ask the user which path applies before proceeding.

3. After intake completes (either path leaves per-process
   `logic-model.json` files under `.rapidx/migration/processes/<slug>/`),
   run `/rapidx:workflow-reimagine` for each process. **Pause** for the
   `reimagine-review` gate — do not proceed to Blueprint without explicit
   architect approval of `.rapidx/migration/blueprint/reimagine.md`.

4. Run `/rapidx:workflow-blueprint`. **Pause** for the `blueprint-review`
   gate — do not proceed to Forward-Engineer without explicit approval of
   `.rapidx/migration/blueprint/blueprint.md` and
   `.rapidx/migration/definitions/<slug>/v1.json`.

5. Run `/rapidx:workflow-forward-engineer`. **Pause** for the
   `parity-review` gate before declaring the process ready for cutover —
   review `.rapidx/migration/parity-reports/<platform>.md` for any
   `NEEDS_REVIEW`/`Partial`/`Roadmap` items first.

6. Report progress via `/rapidx:workflow-status` at each pause point so the
   user always sees the full board, not just the current process.

Never skip a review gate silently — if the user asks to "just run
everything," confirm they intend to bypass the gates before doing so, since
these gates exist specifically so an architect reviews AI-generated design
before code generation and before cutover.
</process>
