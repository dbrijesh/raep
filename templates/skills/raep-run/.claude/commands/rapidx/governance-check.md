---
name: rapidx:governance-check
description: Run a governance and compliance audit on the current project
allowed-tools:
  - Read
  - Bash
---

<objective>
Audit the current project against the active client profile's governance requirements. Check compliance, review gates, audit trail completeness, and maturity level requirements.
</objective>

<checks>
1. **Profile compliance** — Verify active profile governance requirements are met
2. **Secret scanning** — Scan for hardcoded secrets, API keys, passwords
3. **Audit trail** — Verify `.rapidx/` audit logs are present and recent
4. **Review gates** — Check if mandatory review gates are configured
5. **Stack config** — Verify `.rapidx/stack.json` is current and complete
6. **Components** — Verify all required skills/rules/agents are installed
7. **Compliance frameworks** — Check framework-specific requirements per profile:
   - `pharma-regulated`: 21 CFR Part 11 audit trail, e-signature controls
   - `finserv-sox`: SOX IT controls, segregation of duties
   - `insurance-hipaa`: PHI encryption, access controls, audit logging
</checks>

<output-format>
Display results as:
```
Governance Check — [profile-id]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Profile loaded: [profile_id]
✓ Audit trail: active
✓ Secret scanning: enabled
⚠ Review gate: code-review — not yet triggered this session
✗ Missing: [component] — required by profile

Summary: X passed, Y warnings, Z failures
```
</output-format>
