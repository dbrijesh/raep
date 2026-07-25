---
name: rapidx:workflow-forward-engineer
description: Stamp the target-platform scaffold and generate the workload-specific (category-C) code for each approved blueprint (Forward-Engineer stage)
allowed-tools:
  - Read
  - Write
  - Bash
  - Task
---

<objective>
Produce the actual production-grade target application: stamp the generic
platform scaffold once for the engagement, then generate the
workload-specific pieces (workflow seed data, agent registry entries,
forms/pages, nav/branding) for each approved blueprint, and report parity
against the source platform.
</objective>

<process>
1. Confirm `.rapidx/migration/blueprint/blueprint.md` and every
   `definitions/<slug>/v1.json` referenced in it have cleared the
   `blueprint-review` gate. If not, stop and tell the user.

2. **Stamp the scaffold once per engagement** (skip if
   `.rapidx-scaffold-manifest.json` already exists at the target and
   `--force` wasn't passed): run
   `node <rapidx-platform>/bin/install.js --stamp-workflow-scaffold --target <target_dir> --platform-name "<Name>" --platform-slug <slug>`.
   Default `<target_dir>` to `./platform` relative to the engagement repo
   unless the manifest already records a different target; record whichever
   is used in `.rapidx/migration/manifest.json` under `target_dir` so
   re-runs are idempotent.

3. For each process, delegate to `workflow-forward-engineer` (the agent)
   with its `definitions/<slug>/v1.json`, `data-model.json`, and
   `forms.json` to generate the category-C workload-specific files into the
   stamped scaffold:
   - a seed-data entry (workflow definition row) for `workflow-engine`'s
     registry,
   - any `agent_step` pipelines as entries in `agent-service`'s
     `AGENT_REGISTRY`,
   - process-specific form/page components under the UI's workload pages
     directory,
   - nav/branding entries in the AppShell tokens.
   Never touch category-A scaffold files while doing this — those are
   platform mechanics, not workload code.

4. Load `workflow-parity-<platform>` for each process's `source_platform`
   and produce/update `.rapidx/migration/parity-reports/<platform>.md`:
   for every legacy capability used by the process, state Full/Partial/
   Roadmap fidelity in the generated target app, per the skill's parity
   table; anything below Full needs explicit `NEEDS_REVIEW` reasoning.

5. Update `.rapidx/migration/manifest.json`: mark each process
   `forward-engineered`, and note the scaffold stamp location/timestamp.

6. **Stop here — this is the `parity-review` gate.** Report the parity
   report path(s) and flag anything not at Full fidelity; do not declare the
   process cutover-ready until a human has reviewed them. Recommend
   `/rapidx:workflow-status` for the full engagement board.
</process>
