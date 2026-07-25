---
name: rapidx:invariant-catalog
description: "Create or extend the project invariant catalog through a guided Q&A, producing checks that run on every execute phase"
allowed-tools:
  - Read
  - Write
  - Glob
  - Grep
  - Bash
---

<objective>
Author an executable invariant catalog for this project. Invariants are small,
deterministic rules — architectural boundaries, security mandates, coding
standards, testing requirements — that the RapidX invariant engine enforces on
every file change during the execute phase, on whichever platform the developer
is using.

This command drives the `invariant-catalog` agent: a short interview turns the
team's intent into `.rapidx/invariants/catalog.json`.
</objective>

<process>
Delegate to the **invariant-catalog** agent.

1. **Seed from context.** Read `.rapidx/stack.json`, `.rapidx/knowledge/*.md`
   (especially anti-patterns and guidelines), `.rapidx/knowledge/graph.json`,
   and any mandates in `.rapidx/inputs/`. Propose candidate invariants from
   these instead of starting blank.

2. **Interview the user** in clusters: architecture boundaries, security
   mandates, coding standards, testing mandates, operational rules. For each
   accepted rule capture name, rationale (user's words), severity, and scope.

3. **Default severity to `warn`** for non-disruptive adoption; promote to
   `error` (blocks the execute phase) only when the user asks; use `info` for
   advisory rules.

4. **Write** `.rapidx/invariants/catalog.json` in the schema documented in the
   invariant-catalog agent. Preserve existing invariant IDs when extending.

5. **Dry-run** the new catalog with `/rapidx:invariant-check` and report
   pass/fail counts.

6. Remind the user that the `invariant-check` hook now enforces the catalog on
   every Write/Edit, and that `command`-type invariants run during full scans.

Arguments ($ARGUMENTS):
  (none)        → full guided interview
  --extend      → add invariants to an existing catalog
  --from-knowledge → propose invariants purely from learned knowledge, minimal Q&A
</process>
