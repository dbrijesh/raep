---
name: rapidx:spec-review
description: "Review a feature spec for completeness, constitution compliance, and implementation readiness"
allowed-tools:
  - Read
  - Write
  - Bash
---

<objective>
Perform a structured review of `specs/$ARGUMENTS/spec.md` against the project constitution, architecture, and SDD quality criteria. Act as a rigorous spec reviewer: identify gaps, ambiguities, missing acceptance criteria, and risks.
</objective>

<review-criteria>
## 1. Completeness check

For each section of the spec, verify:
- [ ] Problem Statement: clear, specific, measurable impact
- [ ] User Stories: at least P1 story fully specified
- [ ] Each story: has acceptance scenarios in Given/When/Then format
- [ ] Each story: independently testable
- [ ] Technical Design: matches stack.json versions (no version creep)
- [ ] NFRs: performance, security, accessibility targets defined
- [ ] Constitution Check: every principle addressed
- [ ] Open Questions: all blocking questions have owners

## 2. Ambiguity check

Flag any:
- Vague terms without measurable criteria ("fast", "easy", "simple")
- Missing error/edge case scenarios
- Undefined boundary conditions
- Unstated assumptions about existing behavior

## 3. Tech stack compliance

Verify the spec only uses features available in the project's exact versions (from `.rapidx/stack.json`):
- No React 19 patterns if stack is React 18
- No PostgreSQL 17 features if stack is PostgreSQL 16
- No Node.js 22 APIs if stack is Node.js 20

## 4. Constitution gate

Read `.rapidx/CONSTITUTION.md` and verify each principle.
Flag any spec decisions that violate principles.

## 5. Security review

Check for:
- Input validation at all user-facing boundaries
- Authentication/authorization for all new endpoints
- No plaintext secrets or credentials in spec examples
- OWASP Top 10 considerations for web features

## 6. Testability assessment

For each acceptance scenario, verify it can be:
- Written as a unit test (test small unit)
- Written as an integration test (test service boundary)
- Written as an E2E test (test user journey) — if P1 story
</review-criteria>

<process>
1. Run all checks above
2. Categorize findings: BLOCKER | WARNING | SUGGESTION
3. Write review report to `specs/$ARGUMENTS/review.md`
4. Print summary:

```
Spec Review: specs/$ARGUMENTS/spec.md

  BLOCKERS  ({N}): Must fix before planning
  WARNINGS  ({N}): Should fix before implementation
  SUGGESTIONS ({N}): Nice to have

  Constitution: {PASS/FAIL}
  Stack compliance: {PASS/FAIL}
  Testability: {High/Medium/Low}

  Verdict: {READY TO PLAN | NEEDS REVISION | BLOCKED}
```

5. If READY TO PLAN:
   ```
   Next: /rapidx:plan-spec $ARGUMENTS
   ```
</process>
