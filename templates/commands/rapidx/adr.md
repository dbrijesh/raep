---
name: rapidx:adr
description: "Create, list, and check Architecture Decision Records"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
---

<objective>
Manage Architecture Decision Records (ADRs) — the canonical record of significant architectural decisions that form the basis of the RapidX learning and enforcement system.

Usage:
  /rapidx:adr new [title]   → Create a new ADR
  /rapidx:adr list          → List all ADRs with status
  /rapidx:adr check         → Check current diff against accepted ADRs
  /rapidx:adr sync          → Re-sync ADRs to knowledge base (same as /rapidx:learn-arch)
</objective>

<process>
## Detect mode from $ARGUMENTS

### Mode: new [title]

1. Determine next ADR number by scanning `docs/adr/`:
   - List all `*.md` files, extract highest number, increment by 1
   - Default: `docs/adr/` (create if needed)

2. Slugify the title: "Use PostgreSQL as primary DB" → `use-postgresql-as-primary-db`

3. Create file: `docs/adr/{####}-{slug}.md`

4. Populate template:
```markdown
# ADR-{####}: {Title}

**Status**: Proposed
**Date**: {DATE}
**Deciders**: {from git config user.name or placeholder}
**Tech stack context**: {from .rapidx/stack.json}

---

## Context

{Describe the issue or force driving this decision}

## Decision

{State the decision clearly and unambiguously}

## Rationale

{Why this decision? What alternatives were considered?}

### Alternatives considered

| Option | Pros | Cons | Rejected because |
|--------|------|------|-----------------|
| {Option 1} | | | |
| {Option 2} | | | |

## Consequences

### Positive
- {benefit}

### Negative / Trade-offs
- {drawback}

### Neutral
- {side effect}

## Implementation Notes

{Version constraints, migration steps, timeline}

## Compliance

- [ ] Consistent with .rapidx/CONSTITUTION.md
- [ ] Compatible with current tech stack (see .rapidx/stack.json)
- [ ] Security implications reviewed
- [ ] No conflict with existing accepted ADRs
```

5. Update `docs/adr/README.md` index (create if needed):
```markdown
# Architecture Decision Records

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| {####} | [{Title}]({####}-{slug}.md) | Proposed | {DATE} |
```

6. Output:
```
ADR created: docs/adr/{####}-{slug}.md

Status: Proposed

Next steps:
  1. Fill in the Context, Decision, and Rationale sections
  2. Share with team for review
  3. Update status to: Accepted (or Rejected)
  4. Run /rapidx:learn-arch to sync to knowledge base
```

---

### Mode: list

Scan `docs/adr/*.md`, extract title and status from each file.

Output:
```
Architecture Decision Records

  #    Status      Title
  ─────────────────────────────────────────────────
  0001 ✅ Accepted  Use PostgreSQL as primary database
  0002 ✅ Accepted  REST over GraphQL for public API
  0003 🟡 Proposed  Migrate from Express to Fastify
  0004 ❌ Deprecated Use MongoDB (superseded by 0001)

  ✅ Accepted ({N})  — active enforcement rules
  🟡 Proposed ({N})  — under consideration
  ❌ Deprecated ({N}) — anti-patterns to avoid

  Sync to knowledge: /rapidx:learn-arch
```

---

### Mode: check

1. Get current git diff
2. Load all ACCEPTED ADRs from `docs/adr/`
3. For each ADR, check if current changes violate the decision
4. Output findings:

```
ADR Compliance Check

  ✅ ADR-0001 (PostgreSQL): No MySQL/MongoDB detected in changes
  ✅ ADR-0002 (REST over GraphQL): New endpoints use REST pattern
  ⚠️ ADR-0003 (Proposed — monitoring only): Fastify migration in progress
  ❌ ADR-0001 VIOLATION: Found MongoDB import in src/services/cache.ts:15
     Decision: Use PostgreSQL as primary database
     Fix: Use PostgreSQL via Prisma for this use case

  Summary: 1 violation found
  Run /gsd:review to get full code review with ADR compliance
```

---

### Mode: sync

Same as `/rapidx:learn-arch` — re-reads all ADRs and updates:
- `.rapidx/knowledge/architecture.md`
- `.rapidx/knowledge/adr-index.md`
- All platform configs (via `/rapidx:knowledge-sync`)
</process>
