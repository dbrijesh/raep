---
name: workflow-compliance-patterns
description: RapidX workflow compliance patterns skill — traceability, auditability, and electronic-signature conventions for regulated workflow migrations.
origin: RapidX
---

# Skill: Workflow Compliance Patterns

## Purpose

Documents how the workflow platform scaffold satisfies traceability,
auditability, and electronic-signature requirements (21 CFR Part 11, HIPAA,
GxP), so no compliance-critical legacy behavior is lost during
modernization. Migrating a validated system without carrying its compliance
posture forward is a regression, not modernization.

## When to use

- Any `workflow-modernization` engagement where the source platform enforced
  audit trails, e-signatures, or access controls for compliance reasons.
- Writing the `compliance/controls-map.md` artifact during Blueprint.

## Traceability

Every generated process must retain a trace back to its source-platform
definition: `logic-model.json`'s `source_refs` field, carried through to
`definitions/<slug>/v1.json` and cited in the parity report. An auditor must
be able to answer "what did this replace, and how do we know it's
equivalent?" from artifacts alone, not tribal knowledge.

## Auditability — the hash-chain pattern

`audit-core` is an append-only log where each entry's hash includes the
previous entry's hash (a hash chain), making tampering detectable. Every
other service writes to it on any state-changing action (task completed,
e-sign applied, definition published). When reimagining a process, any
step the source platform logged for compliance must map to an explicit
audit-core write in the target — never assume "the framework logs
everything automatically," verify each compliance-relevant transition emits
an audit entry.

## Electronic signatures

An `esign` node requires: a **meaning statement** (what the signer is
attesting to — carry this forward verbatim from the source platform's
signature step, do not paraphrase), the **signer's identity** (from
`identity` service), and a **hash of the signed record's state at signing
time**, chained into `audit-core`. If the source platform's signature step
had a specific legal meaning statement, that exact text must survive into
the target `esign` node's `config.meaning` — this is a compliance fact, not
a UI string to be improved.

## Building the controls-map

For every compliance-relevant node in the blueprint, `workflow-blueprint-architect`
documents in `compliance/controls-map.md`:

```markdown
| Node | Control | Framework | Evidence location |
|---|---|---|---|
| finance_approval (esign) | Electronic signature on cost approval | 21 CFR Part 11 §11.50 | audit-core entry + esign record |
| review_mr (task) | Segregation of duties (creator ≠ approver) | GxP | task-service role check |
```

## Anti-patterns to avoid

- Paraphrasing or shortening a legal e-signature meaning statement during
  migration.
- Assuming audit logging is automatic instead of explicitly mapping each
  compliance-relevant transition to an audit-core write.
- Dropping a source-platform access control because the target's default
  role model doesn't have an exact equivalent — extend the role model
  instead of silently loosening the control.
- Shipping a `workflow-modernization` engagement's Forward-Engineer stage
  without a completed `controls-map.md`.
