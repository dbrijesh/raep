---
name: rapidx:workflow-reimagine
description: Architect-led reimagining of extracted legacy logic into target-platform process/agentic topology (Reimagine stage)
allowed-tools:
  - Read
  - Write
  - Task
---

<objective>
Take the per-process `logic-model.json` files produced by either intake path
and propose a target-platform shape for each: which of the 9 target node
types (`start`, `end`, `task`, `gateway`, `timer`, `agent_step`, `esign`,
`integration`, `logic`) each legacy step becomes, where an `agent_step`
(LLM-backed) can replace or augment a legacy human/rules step, and how the
6-node Agent Pipeline shape (`ap_input → prompt → llm → extract → condition
→ output`) applies to any agent steps. This stage is architect-led — the
agent proposes, a human architect approves at the `reimagine-review` gate.
</objective>

<process>
1. Load the `workflow-modernization-method` and `workflow-agentic-topology-patterns`
   skills, plus the `workflow-parity-<platform>` skill matching each
   process's `source_platform` (from its logic-model.json).

2. For each process under `.rapidx/migration/processes/<slug>/`, delegate to
   `workflow-topology-architect` with its `logic-model.json` (and
   `dependency-graph.json` entry, if present) to produce a proposed target
   topology: node list with types, transitions, and for each candidate
   `agent_step` a proposed pipeline sketch (which of the 6 pipeline nodes
   are needed, what the prompt/extraction schema should look like).

3. Flag every node the architect could not map cleanly to one of the 9 node
   types, or any legacy construct with no clean Appian-parity precedent
   (Partial/Roadmap rows in `workflow-parity-<platform>`), as
   `NEEDS_ARCHITECT_DECISION` rather than forcing a mapping.

4. Aggregate all per-process proposals into
   `.rapidx/migration/blueprint/reimagine.md` — one section per process,
   each with: proposed topology (rendered as a simple ASCII/mermaid flow),
   agentic opportunities identified, open decisions needing the architect's
   input, and estimated parity risk (reuse `migration-analyst`'s 1-5
   complexity scoring).

5. **Stop here — this is the `reimagine-review` gate.** Do not proceed to
   `/rapidx:workflow-blueprint` until a human architect has reviewed and
   annotated `.rapidx/migration/blueprint/reimagine.md` (resolving every
   `NEEDS_ARCHITECT_DECISION`). Report the file path and a summary of open
   decisions; explicitly tell the user this gate requires their sign-off.
</process>
