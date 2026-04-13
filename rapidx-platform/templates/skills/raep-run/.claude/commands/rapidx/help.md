---
name: rapidx:help
description: Show all RapidX Agentic Engineering Platform commands
---

<objective>
Display the complete RapidX command reference including all available commands, their purposes, and usage examples.
</objective>

<output>
# RapidX Agentic Engineering Platform — Command Reference

## Get Things Done workflow commands (/rapidx:*)

| Command | Description |
|---------|-------------|
| `/rapidx:new-project` | Initialize a new project with requirements and roadmap |
| `/rapidx:plan-phase` | Plan the next development phase |
| `/rapidx:execute-phase` | Execute current phase with parallel tasks |
| `/rapidx:verify-work` | Verify completed work against requirements |
| `/rapidx:review` | Code review current changes |
| `/rapidx:ship` | Prepare and execute release |
| `/rapidx:quick` | Quick ad-hoc task or bug fix |
| `/rapidx:map-codebase` | Analyze existing codebase for migration |
| `/rapidx:health` | Check project health status |
| `/rapidx:help` | Show Get Things Done command reference |

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
/rapidx:new-project

# Plan phase 1
/rapidx:plan-phase 1

# Execute current phase
/rapidx:execute-phase

# Verify work
/rapidx:verify-work

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
