---
name: rapidx:invariant-check
description: "Evaluate the project invariant catalog across the whole repository and report violations by severity"
allowed-tools:
  - Read
  - Bash
  - Glob
---

<objective>
Run every invariant in `.rapidx/invariants/catalog.json` against the entire
repository and report results grouped by severity. Use this for a full audit,
in CI, or after onboarding — distinct from the `invariant-check` hook, which
scopes checks to each changed file during the execute phase.
</objective>

<process>
## Step 1 — Confirm a catalog exists

If `.rapidx/invariants/catalog.json` is missing, tell the user to create one
with `/rapidx:invariant-catalog` and stop.

## Step 2 — Evaluate

Run the engine over the repository. The engine is dependency-free Node:

```bash
node -e "const e=require('./.rapidx/hooks/lib/invariants.cjs');const r=e.evaluate(process.cwd());console.log(JSON.stringify(r.summary));console.log(e.renderFailures(r.results)||'  All invariants passed.')"
```

`command`-type invariants execute their shell command during this full scan
(they are skipped by the per-file hook).

## Step 3 — Report

Print:
- Summary line: `{passed}/{evaluated} passed — {errors} errors, {warnings} warnings, {infos} info`
- The grouped failure report from the engine
- For each error-severity failure, the file list and the remediation `message`

## Step 4 — Exit semantics (for CI)

If invoked with `--ci` in $ARGUMENTS and any `error`-severity invariant fails,
exit non-zero so the pipeline blocks. Otherwise always exit 0.

Arguments ($ARGUMENTS):
  (none)   → scan and report
  --ci     → non-zero exit on error-severity failures
  --json   → emit machine-readable JSON only
</process>
