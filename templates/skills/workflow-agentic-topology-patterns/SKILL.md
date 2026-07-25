---
name: workflow-agentic-topology-patterns
description: RapidX workflow agentic topology patterns skill — deciding which legacy workflow steps become agent_step nodes, and how to design their pipelines safely.
origin: RapidX
---

# Skill: Workflow Agentic Topology Patterns

## Purpose

Guides the Reimagine-stage decision of which legacy manual steps become
`agent_step` nodes (agentic-AI-assisted) versus staying plain `task` nodes,
and how to design an `agent_step`'s pipeline once chosen. Used primarily by
`workflow-topology-architect`.

## When to use

- Reimagining a process's topology and deciding where AI assistance adds
  value versus adds risk.
- Designing an `agent_step`'s pipeline during Blueprint.

## Candidate signals for an agent_step

A legacy manual step is a good `agent_step` candidate when it involves:
- **Classification/triage** — e.g. routing a deviation report to a category.
- **Drafting from structured input** — e.g. drafting a root-cause-analysis
  narrative from batch data, for a human to edit and approve.
- **Summarization/extraction** — e.g. summarizing a certificate's contents
  for a reviewer.
- **Anomaly detection over structured/batch data** — flagging outliers for
  human review, not auto-acting on them.

It is a **poor** candidate when the step is: a legal/compliance sign-off
(keep as `task` + `esign`), a deterministic calculation with no ambiguity
(model as `logic`, not `agent_step` — don't spend LLM tokens on arithmetic),
or an action with irreversible external side effects (e.g. releasing
payment) — those stay human-gated regardless of how "obvious" the AI's
suggestion would be.

## Default: human-in-the-loop, not autonomous

Unless the engagement's profile explicitly authorizes autonomous action
(check `governance` in the loaded profile JSON), every `agent_step` produces
a **draft/recommendation** that flows into a following `task` node for human
approval — never directly to `end` or to an `integration` node with
side effects. State this default explicitly in `reimagine.md` for any
process where it applies, so the architect reviewing the gate can override
it deliberately rather than by omission.

## Pipeline design checklist

For each `agent_step`, specify (per `workflow-engine-patterns`' 6-node
pipeline shape):
1. `ap_input` — which workflow variables/form fields feed the prompt.
2. `prompt` — the template, written to be auditable (no hidden system
   instructions the compliance reviewer can't see).
3. `llm` — target model class (not a specific vendor lock — the scaffold's
   `llm-gateway` abstracts the adapter).
4. `extract` — the exact structured shape expected back (so failures are
   detectable, not silently swallowed).
5. `condition` — any pipeline-internal branch (e.g. low-confidence →
   escalate to human immediately instead of producing a draft).
6. `output` — which workflow variables the result populates.

## Anti-patterns to avoid

- Making an irreversible-action step an `agent_step` without a human
  approval task immediately after it.
- Modeling deterministic business rules as `agent_step` instead of `logic`.
- Hiding prompt content from the compliance/parity review — prompts are part
  of the auditable process definition.
- Defaulting to autonomous execution without an explicit governance
  authorization in the profile.
