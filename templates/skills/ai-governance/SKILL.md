---
name: ai-governance
description: RapidX AI governance skill — responsible AI use, audit trails, and governance gates for enterprise agentic engineering.
origin: RapidX
---

# Skill: AI Governance

## Purpose

Ensures responsible and auditable use of AI coding assistants in enterprise contexts. Establishes guardrails, audit trails, and governance checkpoints for AI-assisted development.

## When to use

- Starting any AI-assisted development session
- Before committing AI-generated code to production branches
- When working on regulated or compliance-sensitive systems
- When onboarding new team members to AI-assisted workflows

## Key patterns

### Audit trail requirements

Every AI-assisted coding session must:
1. Log session start with timestamp, model, and context loaded
2. Log all significant decisions (architectural choices, security decisions)
3. Log review gate outcomes
4. Log session end with summary of changes made

### Human oversight gates

Never allow AI to autonomously:
- Push to production branches without human review
- Modify authentication or authorization logic without security review
- Change database schemas without database reviewer approval
- Handle credentials or secrets management

### Context hygiene

- Load only the skills and rules relevant to the current task
- Do not include sensitive business logic in AI context unnecessarily
- Clear context between unrelated tasks to avoid cross-contamination

### Code review requirements

All AI-generated code must be reviewed for:
- [ ] Logic correctness — does it actually solve the problem?
- [ ] Security implications — does it introduce vulnerabilities?
- [ ] Version compatibility — does it use features compatible with configured versions?
- [ ] Test coverage — are tests included and meaningful?
- [ ] Error handling — are all error cases handled explicitly?

## Compliance notes

For regulated profiles (pharma, finserv, hipaa):
- All AI-assisted changes must be traceable in audit logs
- Human approval required before merging to main/master
- AI model version should be logged for reproducibility
