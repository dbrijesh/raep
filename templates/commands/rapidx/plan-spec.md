---
name: rapidx:plan-spec
description: "Get Things Done: Generate a detailed implementation plan from a feature specification"
allowed-tools:
  - Read
  - Write
  - Bash
---

<objective>
Generate a precise, executable implementation plan from the feature specification at `specs/$ARGUMENTS/spec.md`. This plan maps acceptance criteria to technical tasks, respects the project's tech stack versions, and structures work for the Get Things Done execution engine.
</objective>

<process>
## Step 1 — Load spec and context

Read:
1. `specs/$ARGUMENTS/spec.md` — the feature spec (required)
2. `.rapidx/stack.json` — tech stack and versions
3. `.rapidx/CONSTITUTION.md` — project principles
4. `ARCHITECTURE.md` — existing architecture
5. `.rapidx/knowledge/patterns.md` — learned code patterns (if exists)

If `$ARGUMENTS` is empty, list available specs in `specs/` and ask which to plan.

## Step 2 — Run constitution gate

Before planning, verify each constitution principle from `.rapidx/CONSTITUTION.md`.
Block planning if a critical principle is violated — print clear violation message.

## Step 3 — Create plan file

Create: `specs/$ARGUMENTS/plan.md`

Populate using this structure:

```markdown
# Implementation Plan: {FEATURE_NAME}

**Branch**: `{###-feature-slug}`
**Date**: {DATE}
**Spec**: `specs/{###-feature-slug}/spec.md`
**Status**: Ready for execution

---

## Technical Context

**Language/Runtime**: {from stack.json — exact version}
**Framework**: {from stack.json — exact version}
**Database**: {from stack.json}
**Testing**: {from stack.json}
**Version constraint**: Use ONLY features available in {versions}. Do NOT suggest patterns from newer versions.

## Architecture Decisions

{Key decisions made in this plan and their rationale. Reference spec section 3.}

## Implementation Phases

### Phase 0 — Research & Setup (if needed)

- [ ] Verify library compatibility for {any new dependencies}
- [ ] Check existing code patterns in `.rapidx/knowledge/`
- [ ] Create feature branch `{###-feature-slug}`

### Phase 1 — Foundation

**Goal**: {What this phase delivers}
**Tests first**: Write failing tests before any implementation

Tasks:
- [ ] T1.1: {Task} — `{file path}` — {description}
- [ ] T1.2: {Task} — `{file path}` — {description}

Verification: {How to verify Phase 1 is complete}

### Phase 2 — Core Implementation

**Goal**: {Primary story acceptance criteria satisfied}
**Tests first**: All acceptance scenario tests written before coding

Tasks:
- [ ] T2.1: {Task} — `{file path}` — {description}
- [ ] T2.2: {Task} — `{file path}` — {description}

Verification: `{test command}` passes

### Phase 3 — Integration & Edge Cases

Tasks:
- [ ] T3.1: {Edge case handling}
- [ ] T3.2: {Integration with existing modules}

### Phase 4 — Review & Ship Prep

- [ ] Run security-reviewer agent
- [ ] Run code-reviewer agent
- [ ] Update CHANGELOG.md
- [ ] Update relevant documentation
- [ ] All tests pass with >{coverage}% coverage

## Dependency Map

```
T1.1 → T2.1 → T3.1
T1.2 → T2.2
          ↓
        T4.*
```

## Risk Mitigations

{From spec section 6, map each risk to a mitigation task}

## Definition of Done

- [ ] All acceptance scenarios from spec pass
- [ ] Test coverage >{threshold}%
- [ ] Security review clean
- [ ] No regressions in existing tests
- [ ] Docs updated
- [ ] Constitution compliant
```

## Step 4 — Output

```
Plan created: specs/$ARGUMENTS/plan.md

Phases: {N} | Tasks: {total} | Estimated complexity: {Low/Medium/High}

Next steps:
  /rapidx:tasks-from-spec $ARGUMENTS  → Break into GTD tasks
  /gsd:execute-phase                   → Start execution
  /rapidx:spec-review $ARGUMENTS      → Final spec review before coding
```
</process>
