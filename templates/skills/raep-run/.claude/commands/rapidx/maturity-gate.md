---
name: rapidx:maturity-gate
description: Check the current maturity gate status and requirements for progression
allowed-tools:
  - Read
---

<objective>
Display the current maturity level (L0-L4) and what is required to progress to the next level.
</objective>

<maturity-levels>
- **L0 — Ad-hoc**: No structured workflow. Starting point.
- **L1 — Structured**: Get Things Done workflow installed, basic coding standards active.
  - Requirements: GTD commands installed, coding-standards skill active, session audit trail
- **L2 — Governed**: Review gates active, security scanning, client profile configured.
  - Requirements: L1 + review gates + secret scanning + client profile + security-review skill
- **L3 — Optimized**: Full test coverage, deployment pipelines, architecture patterns enforced.
  - Requirements: L2 + TDD workflow + e2e testing + deployment patterns + architecture review gate
- **L4 — Continuously improving**: Metrics, observability, AI-assisted retrospectives.
  - Requirements: L3 + audit reporting + maturity tracking + pod performance metrics
</maturity-levels>

<process>
1. Read `.rapidx/stack.json` for current components
2. Read active profile for maturity_level setting
3. Check which L-level requirements are met
4. Display current level and next-level requirements
5. Show a checklist of what needs to be done to advance
</process>
