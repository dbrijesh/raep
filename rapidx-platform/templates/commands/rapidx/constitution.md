---
name: rapidx:constitution
description: "Create, view, or check the project constitution — the non-negotiable engineering principles"
allowed-tools:
  - Read
  - Write
  - Bash
---

<objective>
Manage the project constitution — a versioned document of non-negotiable engineering principles that all specifications, plans, and code must comply with. Inspired by Spec-Driven Development methodology.

Usage:
  /rapidx:constitution           → View current constitution
  /rapidx:constitution create    → Create new constitution interactively
  /rapidx:constitution check     → Check current work against constitution
  /rapidx:constitution amend     → Propose an amendment
</objective>

<process>
## Detect mode from $ARGUMENTS

### Mode: view (default, no arguments)

Read `.rapidx/CONSTITUTION.md` or `docs/CONSTITUTION.md`.
If neither exists, suggest `/rapidx:constitution create`.

---

### Mode: create

Interactively build the constitution by asking the user about:

1. **Core engineering principles** (e.g., TDD mandatory, no mocks, library-first)
2. **Security requirements** (e.g., OWASP Top 10, no hardcoded secrets, input validation at all boundaries)
3. **Architecture principles** (e.g., domain-driven design, event-driven, monolith vs microservices)
4. **Testing standards** (e.g., >80% coverage, integration tests must hit real DB, E2E for all P1 stories)
5. **Code quality gates** (e.g., no linting errors, max complexity, review requirements)
6. **Version constraints** (from .rapidx/stack.json — use only features from detected versions)
7. **Compliance** (from active client profile — e.g., HIPAA, SOX, 21 CFR Part 11)
8. **AI agent governance** (e.g., agents must not generate secrets, must respect review gates)

Write to `.rapidx/CONSTITUTION.md`:

```markdown
# {PROJECT_NAME} Constitution

**Version**: 1.0.0
**Ratified**: {DATE}
**Profile**: {active client profile}
**Stack**: {from stack.json}

---

## I. {Principle Name}

{Description — be precise and measurable}

**Gate**: {How to verify compliance}
**Automated by**: {hook or agent name, if any}

## II. {Principle Name}

{...repeat...}

---

## Governance

- This constitution supersedes all other practices
- Amendments require: documentation + approval + migration plan
- All specs must include a Constitution Check section
- `/rapidx:governance-check` enforces automated gates
- `/rapidx:spec-review` validates spec compliance

**Version history:**

| Version | Date | Change |
|---------|------|--------|
| 1.0.0 | {DATE} | Initial ratification |
```

---

### Mode: check

Read the constitution and the current diff (`git diff HEAD`).
For each principle, check if current changes comply.
Report:
- PASS: {principle} — {evidence}
- FAIL: {principle} — {violation} — {remediation}
- SKIP: {principle} — {not applicable to these changes}

---

### Mode: amend

Present the current constitution.
Ask the user what they want to amend.
Create a git branch `constitution/amendment-{N}`.
Apply the amendment with version bump.
Document the rationale.
Print: "Amendment drafted. Review with your team before merging."
</process>
