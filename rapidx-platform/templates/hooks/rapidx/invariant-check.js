#!/usr/bin/env node
'use strict';

/**
 * RapidX Invariant Check Hook
 * ---------------------------
 * Runs the project invariant catalog on every file change during the execute
 * phase. Wired as a PostToolUse hook on Write|Edit|MultiEdit so it fires the
 * moment an agent modifies code — on whichever platform the user chose.
 *
 * Behaviour by severity (set per-invariant in the catalog):
 *   error → blocks the operation (exit 2) and tells the agent to fix it
 *   warn  → surfaces a warning on stderr, does not block
 *   info  → recorded in the audit trail only
 *
 * The hook is a no-op when no catalog exists, so it is always safe to install.
 * Authors create the catalog with `/rapidx:invariant-catalog`.
 */

const fs = require('fs');
const path = require('path');

let engine;
try {
  engine = require('./lib/invariants.cjs');
} catch {
  process.exit(0); // engine missing → never break a session
}

function audit(cwd, entry) {
  try {
    const auditLog = path.join(cwd, '.rapidx', 'audit.jsonl');
    fs.appendFileSync(auditLog, JSON.stringify({ ts: new Date().toISOString(), hook: 'invariant-check', ...entry }) + '\n', 'utf8');
  } catch { /* best-effort */ }
}

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', c => { input += c; });
process.stdin.on('end', () => {
  let hook = {};
  try { hook = JSON.parse(input); } catch { process.exit(0); }

  const cwd = hook.cwd || process.cwd();

  // Only react to edits/writes; ignore everything else.
  const editTools = ['Write', 'Edit', 'MultiEdit', 'NotebookEdit', 'apply_patch', 'str_replace_editor'];
  if (hook.tool_name && !editTools.includes(hook.tool_name)) process.exit(0);

  // Skip if no catalog present.
  if (!fs.existsSync(engine.catalogPath(cwd))) process.exit(0);

  // Determine the changed file (when available) to scope the check.
  const ti = hook.tool_input || {};
  const target = ti.file_path || ti.path || ti.notebook_path || null;
  let scopeFiles = null;
  if (target) {
    const rel = engine.relPosix(cwd, target);
    if (!rel.startsWith('..')) scopeFiles = [rel];
  }

  const { results, summary } = engine.evaluate(cwd, { scopeFiles });

  if (summary.failed === 0) {
    if (summary.evaluated > 0) audit(cwd, { event: 'invariants_passed', evaluated: summary.evaluated, scope: scopeFiles ? scopeFiles[0] : 'changed' });
    process.exit(0);
  }

  const report = engine.renderFailures(results);
  audit(cwd, {
    event: 'invariants_failed',
    scope: scopeFiles ? scopeFiles[0] : 'repo',
    errors: summary.errors, warnings: summary.warnings, infos: summary.infos,
    failed: results.filter(r => !r.passed && !r.skipped).map(r => r.id),
  });

  if (summary.errors > 0) {
    // Hard failure — block and ask the agent to remediate before continuing.
    process.stderr.write(
      `[RapidX] Invariant check FAILED — ${summary.errors} error-level invariant(s) violated.\n` +
      `${report}\n` +
      `Fix the violation(s) above before proceeding. See .rapidx/invariants/catalog.json or run /rapidx:invariant-check.\n`
    );
    process.exit(2);
  }

  // Warn/info only — surface but allow.
  process.stderr.write(
    `[RapidX] Invariant warnings (${summary.warnings} warn, ${summary.infos} info):\n${report}\n`
  );
  process.exit(0);
});
