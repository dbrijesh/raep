---
name: architecture-copilot
description: RapidX architecture copilot skill — AI-assisted architectural decision making and documentation.
origin: RapidX
---

# Skill: Architecture Copilot

## Purpose

Assists with architectural decision making, generates Architecture Decision Records (ADRs), and ensures architectural consistency across the codebase.

## When to use

- Designing new system components
- Evaluating technology choices
- Documenting architectural decisions
- Reviewing PRs with architectural implications
- Planning system migrations

## Architecture Decision Records (ADRs)

When making significant architectural decisions, create an ADR:

```markdown
# ADR-{number}: {title}

**Date:** {date}
**Status:** Proposed | Accepted | Deprecated | Superseded

## Context
{Why this decision is needed}

## Decision
{What we decided}

## Consequences
**Positive:** {Benefits}
**Negative:** {Trade-offs}
**Neutral:** {Other impacts}

## Alternatives considered
{What else was considered and why rejected}
```

Save to `docs/architecture/adr-{number}-{slug}.md`.

## Architectural principles for AI-assisted projects

1. **Explicit over implicit** — Architecture should be documented, not in people's heads
2. **Reversible decisions first** — Prefer options that can be changed later
3. **Version-pinned dependencies** — All dependency versions explicit in stack.json
4. **Separation of concerns** — Clear boundaries between layers (API, business logic, data)
5. **Observable systems** — Logging, metrics, and tracing built in from the start
6. **Security by design** — Security controls at the architecture level, not bolted on

## Checklist for architecture review

- [ ] Decision is documented in an ADR
- [ ] Trade-offs are explicitly noted
- [ ] Consistent with existing architectural patterns
- [ ] Version compatibility verified against stack.json
- [ ] Security implications reviewed
- [ ] Scalability implications considered
