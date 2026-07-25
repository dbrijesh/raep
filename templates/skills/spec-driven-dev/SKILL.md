# Skill: Spec-Driven Development

**Applies to**: All platforms (Claude Code, Cursor, VS Code Copilot, Codex, OpenCode)
**Category**: SDLC Methodology
**Always installed**: Yes

## What this skill teaches

Spec-Driven Development (SDD) inverts the traditional development process: specifications become the executable source of truth, and code is their expression in a given language and framework. This skill guides all AI agents on the RapidX platform to follow SDD methodology.

## Core principle

**Specifications drive code. Code serves specifications.**

Before writing any implementation:
1. A spec exists in `specs/{###-feature-slug}/spec.md`
2. The spec has been reviewed (`/rapidx:spec-review`)
3. A plan has been generated (`/rapidx:plan-spec`)
4. Tasks have been created (`/rapidx:tasks-from-spec`)

Agents must NOT begin implementation until Steps 1-4 are complete for any non-trivial feature.

## SDD Phases

### Phase 0 — Specify
Convert the feature request into a structured specification with user stories, acceptance criteria (Given/When/Then), and technical design.

**Output**: `specs/{###}/spec.md`
**Command**: `/rapidx:spec {feature description}`

### Phase 1 — Review
Validate the spec for completeness, constitution compliance, and testability before any planning begins.

**Output**: `specs/{###}/review.md`
**Command**: `/rapidx:spec-review {###-feature-slug}`

### Phase 2 — Plan
Map acceptance criteria to technical tasks. Every task traces back to a specific spec requirement.

**Output**: `specs/{###}/plan.md`
**Command**: `/rapidx:plan-spec {###-feature-slug}`

### Phase 3 — Task
Break the plan into RapidX-compatible executable tasks. Write tests first (failing) before implementation.

**Output**: `specs/{###}/tasks.md`, `.planning/TASKS.md`
**Command**: `/rapidx:tasks-from-spec {###-feature-slug}`

### Phase 4 — Implement
Execute tasks via `/rapidx:execute-phase`. Each task references its spec section. Tests are written before implementation code.

### Phase 5 — Verify
Verify completed implementation against spec acceptance criteria.

**Command**: `/rapidx:verify-work`
**Verified against**: `specs/{###}/spec.md` acceptance scenarios

### Phase 6 — Close
Update spec status to "Implemented". Extract patterns to `.rapidx/knowledge/`. Update CHANGELOG.

## Rules for all agents

1. **Never implement without a spec** — If asked to build a feature without a spec, first run `/rapidx:spec`
2. **Never plan without a reviewed spec** — Spec review must pass (no BLOCKERs) before planning
3. **Tests before code** — Write failing tests from acceptance scenarios before implementing
4. **Version-bound design** — Only use features available in the stack versions in `.rapidx/stack.json`
5. **Trace everything** — Every code change should reference a spec task ID in the commit message
6. **Update the spec on discovery** — If implementation reveals spec gaps, update the spec first, then resume

## Spec directory structure

```
specs/
├── INDEX.md                          # Auto-updated index of all specs
├── 001-user-authentication/
│   ├── spec.md                       # Source of truth
│   ├── review.md                     # Review report
│   ├── plan.md                       # Implementation plan
│   ├── tasks.md                      # RapidX task list
│   └── checklist.md                  # Completion tracking
└── 002-payment-integration/
    └── ...
```

## Constitution integration

Every spec must include a "Constitution Check" section. The `/rapidx:constitution check` command scans the current diff against all principles. The `spec-validator` hook runs this check automatically on commit.

## Version-aware spec writing

When writing specs, always reference exact versions from `.rapidx/stack.json`:

```markdown
**Version constraint**: Use React 18.3.x concurrent patterns.
Do NOT use React 19 Actions or Server Components (not in this stack).
Use Node.js 20 LTS APIs only. No Node.js 22 features.
```

## Agentic workflow integration

This skill integrates with:
- `.github/workflows/rapidx-spec-check.yml` — Auto-validates specs on PR
- `hooks/spec-validator.js` — Pre-commit spec validation
- `agents/spec-writer.md` — Dedicated spec creation agent
- `agents/knowledge-curator.md` — Extracts patterns from completed specs
