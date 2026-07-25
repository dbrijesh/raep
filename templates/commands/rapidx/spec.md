---
name: rapidx:spec
description: "RapidX: Create a structured feature specification using Spec-Driven Development"
allowed-tools:
  - Read
  - Write
  - Bash
---

<objective>
Create a complete, structured feature specification for "$ARGUMENTS" using the Spec-Driven Development (SDD) methodology. The specification becomes the executable source of truth — code serves the spec, not the other way around.
</objective>

<process>
## Step 1 — Understand the request

Parse "$ARGUMENTS" to extract:
- Feature name or identifier
- High-level description
- Any constraints or context provided

If "$ARGUMENTS" is empty, prompt the user: "What feature or capability would you like to specify?"

## Step 2 — Load project context

Read the following in order (stop at first found for each):
1. `.rapidx/stack.json` — tech stack and versions
2. `.rapidx/CONSTITUTION.md` or `docs/CONSTITUTION.md` — project principles
3. `ARCHITECTURE.md` or `docs/ARCHITECTURE.md` — architecture context
4. `.planning/PROJECT.md` — project goals
5. `.rapidx/knowledge/` — previously learned patterns

## Step 3 — Create spec directory and file

Create: `specs/{###-feature-slug}/spec.md`
Where `###` is the next available 3-digit number (scan `specs/` directory).

Populate the spec using this template:

```markdown
# Feature Specification: {FEATURE_NAME}

**Branch**: `{###-feature-slug}`
**Created**: {DATE}
**Status**: Draft
**Author**: RapidX Spec-Driven Development
**Stack**: {from stack.json}

---

## 1. Problem Statement

{Clear description of the problem this feature solves. One paragraph.}

## 2. User Scenarios & Acceptance Criteria

<!-- Each story must be independently testable and deliverable -->

### Story 1 — {Title} (Priority: P1)

{Describe the user journey in plain language}

**Why P1**: {Business value justification}

**Independent Test**: {How to test this in isolation}

**Acceptance Scenarios**:
1. **Given** {state}, **When** {action}, **Then** {outcome}
2. **Given** {state}, **When** {action}, **Then** {outcome}

---

### Story 2 — {Title} (Priority: P2)

{Repeat pattern}

---

## 3. Technical Design

### 3.1 Tech Stack Context

From `.rapidx/stack.json`:
- **Frontend**: {framework@version}
- **Backend**: {language-framework@version}
- **Database**: {db@version} via {orm}
- **Version constraints**: Use features available in {stack versions}. Do NOT use features from newer versions.

### 3.2 Architecture Fit

{How this feature fits into the existing architecture. Reference ARCHITECTURE.md sections.}

### 3.3 Data Model Changes

{New entities, schema changes, migrations needed. None if not applicable.}

### 3.4 API Design

{New endpoints, request/response shapes. REST/GraphQL/gRPC per stack config.}

### 3.5 Component / Module Design

{UI components, backend modules, service boundaries.}

## 4. Non-Functional Requirements

| Requirement | Target | Measurement |
|------------|--------|-------------|
| Performance | {e.g., <200ms p95} | {how to measure} |
| Security | {e.g., OWASP Top 10} | security-reviewer agent |
| Accessibility | {e.g., WCAG 2.1 AA} | e2e-testing agent |
| Test Coverage | {e.g., >80%} | vitest/jest coverage |

## 5. Constitution Check

<!-- Gate: verify against project principles before planning -->

{List each constitution principle and confirm this spec complies. Mark violations.}

- [ ] {Principle 1}: {compliance note}
- [ ] {Principle 2}: {compliance note}
- [ ] TDD: Acceptance scenarios → test cases before implementation
- [ ] Security: No secrets, input validation at all boundaries

## 6. Open Questions & Risks

| # | Question / Risk | Owner | Status |
|---|----------------|-------|--------|
| 1 | {Open question} | {who} | Open |
| 2 | {Risk} | {who} | Mitigating |

## 7. Spec History

| Date | Change | Author |
|------|--------|--------|
| {DATE} | Initial draft | RapidX SDD |
```

## Step 4 — Output summary

Print:
```
Spec created: specs/{###-feature-slug}/spec.md

Next steps:
  /rapidx:plan-spec {###-feature-slug}   → Generate implementation plan
  /rapidx:spec-review {###-feature-slug} → Review spec for gaps
  /rapidx:constitution                    → View/update project principles
```
</process>
