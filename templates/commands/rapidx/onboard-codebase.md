---
name: rapidx:onboard-codebase
description: Onboard an existing codebase to RapidX — analyze, document, and configure
allowed-tools:
  - Read
  - Write
  - Bash
---

<objective>
Analyze an existing codebase and configure RapidX for it. This is the first step for brownfield/modernization engagements.
</objective>

<process>
1. Run codebase analysis:
   - Detect technologies, frameworks, and versions
   - Map directory structure and key files
   - Identify existing tests, CI/CD, and documentation
   - Find potential technical debt and risk areas

2. Auto-configure stack.json from detected technologies

3. Suggest the appropriate client profile based on:
   - Codebase maturity
   - Technology choices
   - Presence of compliance-related code

4. Generate initial documentation:
   - Update CLAUDE.md with codebase context
   - Create `.planning/PROJECT.md` with codebase overview
   - Create `.planning/RISKS.md` with identified technical debt

5. Recommend Get Things Done workflow starting point:
   - If greenfield: `/rapidx:new-project`
   - If brownfield/migration: `/rapidx:map-codebase`

Output a structured onboarding summary.
</process>
