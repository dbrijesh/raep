---
name: client-onboarding
description: RapidX client onboarding skill — structured process for onboarding a new client engagement.
origin: RapidX
---

# Skill: Client Onboarding

## Purpose

Provides a structured checklist and process for onboarding a new client engagement to RapidX. Ensures all context, standards, and governance requirements are captured before development begins.

## When to use

- Starting a new client engagement
- Inheriting an existing codebase from a client
- Transitioning between project phases

## Onboarding checklist

### 1. Profile setup
- [ ] Select appropriate client profile (default / enterprise-standard / regulated)
- [ ] Configure client_name in profile JSON
- [ ] Set maturity_level based on current state

### 2. Tech stack discovery
- [ ] Run auto-detection on existing codebase
- [ ] Confirm all framework versions with the team
- [ ] Document any non-standard dependencies
- [ ] Map to `.rapidx/stack.json`

### 3. Coding standards alignment
- [ ] Review `rules/common/` with the team
- [ ] Identify any client-specific coding standards to add
- [ ] Configure language-specific rules for the stack

### 4. Workflow setup
- [ ] Initialize RapidX with `/rapidx:new-project` or `/rapidx:map-codebase`
- [ ] Create initial PROJECT.md
- [ ] Set up first milestone

### 5. Governance setup
- [ ] Configure review gates appropriate for the engagement
- [ ] Set up audit trail (`.rapidx/audit.jsonl`)
- [ ] Configure secret scanning hooks
- [ ] Brief team on mandatory review requirements

### 6. Platform configuration
- [ ] Install for all team IDEs (Claude Code, VS Code, Cursor)
- [ ] Verify CLAUDE.md is correct and up to date
- [ ] Share AGENTS.md with the team

## Key questions to answer during onboarding

1. What are the compliance/regulatory requirements?
2. What is the target maturity level?
3. Are there existing coding standards to preserve?
4. What CI/CD pipeline is in place?
5. Who are the required reviewers for each gate type?
