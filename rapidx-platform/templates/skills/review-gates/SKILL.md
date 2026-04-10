---
name: review-gates
description: RapidX review gates skill — structured human review checkpoints in the AI-assisted development workflow.
origin: RapidX
---

# Skill: Review Gates

## Purpose

Establishes structured human review checkpoints that must be completed before proceeding to the next stage of development. Prevents fully autonomous AI operation in contexts requiring human judgment.

## When to use

- Before merging any feature branch
- Before deploying to staging or production
- When changes touch authentication, payments, or sensitive data
- When changes affect data models or database schemas

## Standard review gates

### Code review gate
**Trigger:** Before merging to main/develop
**Checklist:**
- [ ] Code is readable and follows coding standards
- [ ] Logic is correct and handles edge cases
- [ ] No commented-out code or debug logs
- [ ] Tests are present and meaningful
- [ ] PR description explains the "why" not just the "what"

### Security review gate
**Trigger:** Auth changes, payment handling, sensitive data access, new API endpoints
**Checklist:**
- [ ] No hardcoded secrets or credentials
- [ ] Input validation on all user-facing endpoints
- [ ] Authentication and authorization checks correct
- [ ] SQL injection / XSS / CSRF protections in place
- [ ] Sensitive data encrypted at rest and in transit

### Architecture review gate
**Trigger:** New services, database schema changes, infrastructure changes
**Checklist:**
- [ ] Change aligns with system architecture decisions
- [ ] No unnecessary new dependencies introduced
- [ ] Scalability implications considered
- [ ] Rollback strategy defined

### Database review gate
**Trigger:** Schema migrations, query changes on large tables, index changes
**Checklist:**
- [ ] Migration is reversible (has a down migration)
- [ ] No breaking changes without coordination
- [ ] Indexes appropriate for query patterns
- [ ] Large table changes are batched or zero-downtime

## Compliance-specific gates

For `pharma-regulated`:
- Validation protocol review (IQ/OQ/PQ evidence)
- Audit trail completeness review
- E-signature implementation review

For `finserv-sox`:
- SOX IT controls review
- Segregation of duties verification
- Audit trail completeness

For `insurance-hipaa`:
- PHI data handling review
- Access control correctness
- Encryption implementation review
