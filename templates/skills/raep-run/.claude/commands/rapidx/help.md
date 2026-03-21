---
name: rapidx:help
description: Show all RapidX Agentic Engineering Platform commands
---

<objective>
Display the complete RapidX command reference including all available commands, their purposes, and usage examples.
</objective>

<output>
# RapidX Agentic Engineering Platform — Command Reference

## Get Things Done workflow commands (/gsd:*)

| Command | Description |
|---------|-------------|
| `/gsd:new-project` | Initialize a new project with requirements and roadmap |
| `/gsd:plan-phase` | Plan the next development phase |
| `/gsd:execute-phase` | Execute current phase with parallel tasks |
| `/gsd:verify-work` | Verify completed work against requirements |
| `/gsd:review` | Code review current changes |
| `/gsd:ship` | Prepare and execute release |
| `/gsd:quick` | Quick ad-hoc task or bug fix |
| `/gsd:map-codebase` | Analyze existing codebase for migration |
| `/gsd:health` | Check project health status |
| `/gsd:help` | Show Get Things Done command reference |

## RapidX enterprise commands (/rapidx:*)

| Command | Description |
|---------|-------------|
| `/rapidx:help` | Show this command reference |
| `/rapidx:init-client` | Initialize or switch client profile |
| `/rapidx:switch-client` | Switch active client profile |
| `/rapidx:add-tech` | Add a technology to the current stack |
| `/rapidx:governance-check` | Run governance and compliance audit |
| `/rapidx:maturity-gate` | Check maturity gate status and requirements |
| `/rapidx:audit-report` | Generate audit trail report |
| `/rapidx:onboard-codebase` | Onboard an existing codebase to RapidX |
| `/rapidx:health` | Check RapidX installation health |

## Quick reference

```bash
# Start a new project
/gsd:new-project

# Plan phase 1
/gsd:plan-phase 1

# Execute current phase
/gsd:execute-phase

# Verify work
/gsd:verify-work

# Switch client profile
/rapidx:switch-client enterprise-standard

# Add Python to an existing TypeScript project
/rapidx:add-tech

# Run governance check
/rapidx:governance-check
```

## Current configuration

Run `/rapidx:health` to see current profile, tech stack, and installed components.
</output>
