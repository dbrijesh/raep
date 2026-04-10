---
name: rapidx:audit-report
description: Generate a governance audit trail report from RapidX session logs
allowed-tools:
  - Read
  - Bash
---

<objective>
Generate a formatted audit report from the `.rapidx/audit.jsonl` log file. Useful for compliance evidence and sprint retrospectives.
</objective>

<process>
1. Read `.rapidx/audit.jsonl`
2. Parse JSONL entries (each line is one event)
3. Group by: session, date, event type
4. Count: sessions, commands used, review gates triggered, secrets detected
5. Generate formatted report

Report sections:
- **Summary**: date range, total sessions, total events
- **Commands used**: which GTD and RapidX commands were used
- **Review gates**: which gates were triggered and their outcomes
- **Security events**: any secret scanning findings
- **Stack changes**: any `add-tech` or profile switches
</process>

<output-format>
```
RapidX Audit Report
Profile: [profile_id] | Period: [date range]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Sessions: X  |  Commands: Y  |  Review gates: Z

Commands used:
  /gsd:new-project     2 times
  /gsd:execute-phase   8 times
  /gsd:review          5 times
  /rapidx:governance-check  1 time

Review gates triggered:
  code-review:      5 passed, 0 failed
  security-review:  2 passed, 0 failed
```
</output-format>
