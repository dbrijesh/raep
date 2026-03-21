---
name: rapidx:add-tech
description: Add a technology or framework to the current RapidX stack configuration
allowed-tools:
  - Read
  - Write
  - Bash
---

<objective>
Add a new technology to the current project's stack. This installs the relevant skills, rules, and agents for the new technology without reinstalling everything else.
</objective>

<process>
1. Read `.rapidx/stack.json` to understand current stack
2. Ask user which category they're adding (frontend/backend/database/infrastructure/testing/mobile)
3. Run the questionnaire for that category only
4. Compute delta: which new skills/rules/agents are needed
5. Install only the delta components
6. Update `.rapidx/stack.json` with new stack entries
7. Regenerate CLAUDE.md, AGENTS.md, and copilot-instructions.md
8. Display what was added

Example: Adding a Python microservice to a TypeScript project
- Adds: python rules, python-patterns, python-testing skills
- Does NOT reinstall: existing TypeScript/React components
</process>
