---
name: rapidx:switch-client
description: Switch the active RapidX client profile
argument-hint: "[profile-id]"
allowed-tools:
  - Read
  - Write
  - Bash
---

<objective>
Switch the active client profile. This updates the governance rules, compliance requirements, review gates, and coding standards for the current project.
</objective>

<process>
1. Read argument (profile ID) or list available profiles if not provided
2. Validate that the profile exists in `profiles/{profile_id}.json`
3. Read current `.rapidx/stack.json`
4. Update `profile` field in stack.json
5. Reload the profile
6. Regenerate CLAUDE.md with new profile context
7. Regenerate AGENTS.md with new profile context
8. If `.github/copilot-instructions.md` exists, regenerate it
9. Display summary of changes

Example usage:
```
/rapidx:switch-client enterprise-standard
/rapidx:switch-client pharma-regulated
/rapidx:switch-client finserv-sox
```
</process>
