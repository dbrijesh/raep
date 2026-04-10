---
name: rapidx:init-client
description: Initialize or configure a RapidX client profile for this project
allowed-tools:
  - Read
  - Write
  - Bash
---

<objective>
Initialize or update the client profile for this project. This sets the governance rules, compliance requirements, and coding standards that will be enforced.
</objective>

<process>
1. Check if `.rapidx/stack.json` exists
2. If yes, display current profile and ask if user wants to change it
3. If no, list available profiles and prompt for selection
4. Load the selected profile from `profiles/{profile_id}.json`
5. Update `.rapidx/stack.json` with the new profile ID
6. Regenerate CLAUDE.md and AGENTS.md with new profile context
7. Display confirmation with profile summary
</process>

<profiles>
Available profiles:
- `default` — Sensible defaults, no specific governance
- `greenfield-startup` — Minimal governance, maximum speed
- `enterprise-standard` — Standard enterprise controls
- `pharma-regulated` — 21 CFR Part 11 compliance
- `finserv-sox` — Financial services / SOX compliance
- `insurance-hipaa` — Insurance / HIPAA compliance

Switch profiles with: `/rapidx:switch-client <profile-id>`
</profiles>
