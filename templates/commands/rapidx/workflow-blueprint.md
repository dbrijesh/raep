---
name: rapidx:workflow-blueprint
description: Turn an approved reimagine.md into a concrete, versioned workflow definition plus forms/data model/compliance blueprint (Blueprint stage)
allowed-tools:
  - Read
  - Write
  - Task
---

<objective>
Convert the architect-approved `.rapidx/migration/blueprint/reimagine.md`
into concrete, machine-executable artifacts: a canonical `graph_json`
workflow definition per process, its data model, its forms, and a
compliance controls map — everything Forward-Engineer needs to generate
code without further design decisions. This stage is architect-led; the
agents draft, the architect approves at the `blueprint-review` gate.
</objective>

<process>
1. Confirm `.rapidx/migration/blueprint/reimagine.md` has no unresolved
   `NEEDS_ARCHITECT_DECISION` markers. If any remain, stop and tell the user
   the `reimagine-review` gate has not been cleared yet.

2. For each process, delegate to `workflow-blueprint-architect` with its
   approved reimagine section and `logic-model.json` to produce
   `.rapidx/migration/definitions/<slug>/v1.json` — a canonical `graph_json`
   workflow definition (nodes/edges using the 9 node types, agent-step
   pipelines using the 6-node shape) ready for the target platform's
   workflow engine.

3. For each process, delegate to `workflow-data-modeler` (using
   `forms.json` if present, else inferring fields from the logic model) to
   produce/refine `.rapidx/migration/processes/<slug>/data-model.json` —
   entities, fields, relationships, and the JSON-in-SQLite persistence shape
   (Pydantic `field_validator`-backed JSON columns, `_payload` wrapper
   convention) matching the target scaffold's existing services.

4. Load `workflow-compliance-patterns` and produce/update
   `.rapidx/migration/compliance/controls-map.md`: for every `esign` node,
   every audit-relevant transition, and any cross-cutting requirement named
   in the active profile's `governance` block (21 CFR Part 11, HIPAA, GxP,
   zero-trust), record which target-platform service (audit-core, esign,
   identity) satisfies it.

5. Aggregate into `.rapidx/migration/blueprint/blueprint.md`: one section
   per process linking to its `definitions/<slug>/v1.json`, `forms.json`,
   `data-model.json`, and relevant `controls-map.md` rows, plus any
   `NEEDS_ARCHITECT_DECISION` flags raised by data modeling or compliance
   mapping.

6. **Stop here — this is the `blueprint-review` gate.** Do not proceed to
   `/rapidx:workflow-forward-engineer` until a human architect has approved
   `blueprint.md` and each `definitions/<slug>/v1.json`. Report the file
   paths and summarize open decisions; tell the user this gate requires
   their sign-off.
</process>
