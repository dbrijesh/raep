---
name: rapidx:health
description: Check RapidX installation health and display current configuration
allowed-tools:
  - Read
  - Bash
---

<objective>
Display a comprehensive health status of the current RapidX installation, including profile, tech stack, installed components, and any configuration issues.
</objective>

<process>
1. Check `.rapidx/stack.json` exists and is valid JSON
2. Display:
   - Current profile (name, maturity level, compliance frameworks)
   - Tech stack summary (frontend, backend, database, infra)
   - Installed components count (rules, skills, agents, hooks)
   - Platform configurations found (.claude/, .cursor/, .github/)
   - Last update timestamp
3. Check for common issues:
   - Missing CLAUDE.md
   - Missing AGENTS.md
   - Empty commands directories
   - Stale stack.json (>30 days old)
4. Display action suggestions if issues found
</process>

<output-format>
```
RapidX Health Check
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Profile:    enterprise-standard (L2)
Installed:  2026-03-21

Tech stack:
  Frontend:  React 18.3.1
  Backend:   TypeScript 5.4.5 + Express 4.18
  Database:  PostgreSQL 16.2 + Prisma
  CI/CD:     GitHub Actions

Components:
  Rules:     2 installed (common, typescript)
  Skills:    18 installed
  Agents:    8 installed
  Hooks:     4 active

Platforms:
  ✓ Claude Code (.claude/)
  ✓ VS Code + Copilot (.github/copilot-instructions.md)
  ✓ Cursor IDE (.cursor/)

Status: ✓ Healthy
```
</output-format>
