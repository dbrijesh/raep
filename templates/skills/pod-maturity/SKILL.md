---
name: pod-maturity
description: RapidX pod maturity model — track and improve team maturity in AI-assisted engineering practices.
origin: RapidX
---

# Skill: Pod Maturity

## Purpose

Tracks and improves a delivery team's maturity in using AI-assisted engineering practices. Provides a structured progression path from ad-hoc AI use to optimized, continuously improving AI-assisted delivery.

## Maturity levels

### L0 — Ad-hoc
- AI tools installed but no structured workflow
- No coding standards enforced
- No audit trail
- **Upgrade path:** Install RapidX, run `/gsd:new-project`

### L1 — Structured
- Get Things Done workflow active
- Basic coding standards installed
- Session audit trail active
- **Indicators:** Team uses `/gsd:*` commands regularly
- **Upgrade path:** Configure review gates, add security scanning

### L2 — Governed
- Review gates configured and active
- Secret scanning on all commits
- Client profile configured
- Security review skill active
- **Indicators:** All merges go through review gates
- **Upgrade path:** Add TDD workflow, e2e testing, deployment patterns

### L3 — Optimized
- TDD workflow active (tests written before code)
- E2e testing automated
- Deployment pipeline patterns enforced
- Architecture review gate active
- **Indicators:** >80% test coverage, green CI/CD
- **Upgrade path:** Add metrics, audit reporting, retrospective patterns

### L4 — Continuously improving
- Audit reporting and metrics active
- Regular retrospectives on AI-assisted workflow
- AI model selection based on task type
- Pod performance tracked and improving
- **Indicators:** Regular maturity gate reviews, improving velocity

## Assessment questions

1. Are all merges going through review gates? → L2
2. Is TDD practiced consistently? → L3
3. Is the CI/CD pipeline green >95% of the time? → L3
4. Are retrospectives happening with AI workflow data? → L4
5. Is the team improving velocity quarter-over-quarter? → L4
