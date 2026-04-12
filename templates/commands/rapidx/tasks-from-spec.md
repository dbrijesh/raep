---
name: rapidx:tasks-from-spec
description: "Get Things Done: Convert a spec plan into GTD-compatible executable tasks"
allowed-tools:
  - Read
  - Write
  - Bash
---

<objective>
Transform the implementation plan at `specs/$ARGUMENTS/plan.md` into a GTD-compatible task list in `.planning/TASKS.md`, ready for `/rapidx:execute-phase` to pick up and run.
</objective>

<process>
## Step 1 — Read plan and existing GTD state

Read:
1. `specs/$ARGUMENTS/plan.md` — the implementation plan
2. `.planning/TASKS.md` — existing GTD tasks (to avoid duplication)
3. `.planning/config.json` — GTD config, current phase
4. `.rapidx/stack.json` — tech stack for task context

## Step 2 — Convert plan tasks to GTD format

For each task in the plan phases, generate a GTD-format task entry:

```markdown
## Task: {T-number} — {Task Title}

**Phase**: {Phase N}
**Feature**: {feature-slug from $ARGUMENTS}
**Spec**: specs/{feature-slug}/spec.md#{section}
**Status**: pending
**Priority**: {P1/P2/P3}
**Agent**: {which ECC agent should handle this}
**Depends on**: {T-number list or none}

### Description

{Full task description with enough context for a subagent}

### Acceptance

{Direct mapping to spec acceptance scenario}

### Tech Notes

{Version-specific implementation notes from stack.json}
{e.g., "Use React 18 concurrent features — not React 19 patterns"}
{e.g., "PostgreSQL 16 — use json_table() available since PG 16"}

### Tests

- [ ] Unit: {what to test}
- [ ] Integration: {what to test}
- [ ] E2E: {if applicable}
```

## Step 3 — Write tasks file

Write to `specs/$ARGUMENTS/tasks.md` AND append to `.planning/TASKS.md`.

Also create/update `.planning/config.json` with:
```json
{
  "active_spec": "$ARGUMENTS",
  "active_feature": "{feature name}",
  "spec_path": "specs/$ARGUMENTS/spec.md",
  "plan_path": "specs/$ARGUMENTS/plan.md",
  "tasks_path": "specs/$ARGUMENTS/tasks.md"
}
```

## Step 4 — Generate checklist

Create `specs/$ARGUMENTS/checklist.md`:

```markdown
# Implementation Checklist: {FEATURE_NAME}

## Constitution Gates
- [ ] All principles verified (run /rapidx:constitution check)

## Per-Story Completion
{One section per user story from spec}

### Story 1 — {Title}
- [ ] Tests written (failing)
- [ ] Implementation complete
- [ ] Tests passing
- [ ] Code review passed
- [ ] Acceptance scenario verified

## Quality Gates
- [ ] Security review: `/rapidx:governance-check`
- [ ] Test coverage >{threshold}%
- [ ] No linting errors
- [ ] Documentation updated
- [ ] CHANGELOG entry added

## Ship Gate
- [ ] PR opened
- [ ] All checks green
- [ ] Spec marked as: Implemented
```

## Step 5 — Output

```
Tasks generated from spec: specs/$ARGUMENTS/

  spec.md      → Feature specification
  plan.md      → Implementation plan
  tasks.md     → GTD task list ({N} tasks)
  checklist.md → Completion checklist

Tasks added to .planning/TASKS.md

Start execution:
  /rapidx:execute-phase     → Run next pending tasks
  /rapidx:verify-work       → Verify against spec acceptance criteria
  /rapidx:spec-review $ARGUMENTS → Pre-flight spec review
```
</process>
