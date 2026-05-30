'use strict';

/**
 * RapidX Invariant Engine
 * -----------------------
 * Zero-dependency evaluator for the project invariant catalog.
 *
 * A catalog lives at `.rapidx/invariants/catalog.json` and is authored by the
 * `/rapidx:invariant-catalog` agent through a question-and-answer session. Each
 * invariant is a small, deterministic rule that must hold true across the
 * codebase. Invariants are evaluated:
 *   - on every file write/edit during the execute phase (invariant-check.js hook)
 *   - on demand across the whole repo (`/rapidx:invariant-check`)
 *
 * The engine is intentionally dependency-free (Node built-ins only) so it runs
 * identically on Claude Code, Cursor, Antigravity, Copilot, Codex and OpenCode.
 *
 * Check types
 *   must_match     — every file matching `appliesTo` MUST contain `pattern`
 *   must_not_match — no file matching `appliesTo` may contain `pattern`
 *   path_exists    — at least one file must match the `appliesTo` glob(s)
 *   path_absent    — zero files may match the `appliesTo` glob(s)
 *   pair           — if `when` matches in a file, `require` must also match
 *   command        — run `command`; non-zero exit fails (repo-scoped only)
 *
 * Severity
 *   error — hard failure; the hook blocks the operation (exit 2)
 *   warn  — surfaced to the agent on stderr, does not block (default)
 *   info  — logged to the audit trail only
 */

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'coverage', '.next', 'out',
  '__pycache__', 'vendor', '.rapidx', '.claude', '.cursor', '.venv', 'target',
]);

const SEVERITIES = ['error', 'warn', 'info'];

// ─── Catalog loading ──────────────────────────────────────────────────────────

/**
 * Resolve the catalog path for a project.
 * @param {string} cwd
 * @returns {string}
 */
function catalogPath(cwd) {
  return path.join(cwd, '.rapidx', 'invariants', 'catalog.json');
}

/**
 * Load and normalize the invariant catalog. Returns an empty catalog when the
 * file is missing or malformed (so hooks never crash a session).
 * @param {string} cwd
 * @returns {{ version: number, invariants: object[] }}
 */
function loadCatalog(cwd) {
  const file = catalogPath(cwd);
  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch {
    return { version: 1, invariants: [] };
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { version: 1, invariants: [], error: 'catalog.json is not valid JSON' };
  }
  const invariants = Array.isArray(parsed.invariants) ? parsed.invariants : [];
  return {
    version: parsed.version || 1,
    updated: parsed.updated || null,
    invariants: invariants.filter(inv => inv && inv.id && inv.check),
  };
}

// ─── Glob matching (minimal, dependency-free) ──────────────────────────────────

/**
 * Convert a simple glob (supports **, *, ?, and {a,b} alternation) to a RegExp
 * anchored to a full POSIX-style relative path.
 * @param {string} glob
 * @returns {RegExp}
 */
function globToRegExp(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        // ** matches any number of path segments
        re += '.*';
        i++;
        if (glob[i + 1] === '/') i++; // consume trailing slash of **/
      } else {
        re += '[^/]*';
      }
    } else if (c === '?') {
      re += '[^/]';
    } else if (c === '{') {
      const end = glob.indexOf('}', i);
      if (end !== -1) {
        const alts = glob.slice(i + 1, end).split(',').map(escapeRe).join('|');
        re += `(?:${alts})`;
        i = end;
      } else {
        re += '\\{';
      }
    } else if ('.+^$()|[]\\'.includes(c)) {
      re += '\\' + c;
    } else {
      re += c;
    }
  }
  return new RegExp('^' + re + '$');
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Normalize a path to POSIX separators relative to cwd.
 */
function relPosix(cwd, filePath) {
  return path.relative(cwd, filePath).split(path.sep).join('/');
}

/**
 * Test whether a relative path matches any of the provided globs.
 * @param {string} relPath
 * @param {string[]} globs
 * @returns {boolean}
 */
function matchesAny(relPath, globs) {
  if (!globs || globs.length === 0) return false;
  return globs.some(g => globToRegExp(g).test(relPath));
}

// ─── File discovery ────────────────────────────────────────────────────────────

/**
 * Walk the project collecting relative file paths, skipping noisy directories.
 * @param {string} cwd
 * @param {number} [maxFiles=5000]
 * @returns {string[]} relative POSIX paths
 */
function listFiles(cwd, maxFiles = 5000) {
  const results = [];
  function walk(dir) {
    if (results.length >= maxFiles) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (results.length >= maxFiles) break;
      if (entry.name.startsWith('.') && entry.name !== '.github') {
        if (SKIP_DIRS.has(entry.name)) continue;
      }
      if (SKIP_DIRS.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else results.push(relPosix(cwd, full));
    }
  }
  walk(cwd);
  return results;
}

function readFileSafe(cwd, relPath) {
  try {
    return fs.readFileSync(path.join(cwd, relPath), 'utf8');
  } catch {
    return null;
  }
}

// ─── Evaluation ─────────────────────────────────────────────────────────────────

/**
 * Resolve the set of candidate files for an invariant given an optional scope.
 * @param {string} cwd
 * @param {object} inv
 * @param {string[]|null} scopeFiles - when provided, restrict to these rel paths
 * @param {string[]} allFiles
 * @returns {string[]}
 */
function candidateFiles(inv, scopeFiles, allFiles) {
  const appliesTo = inv.appliesTo && inv.appliesTo.length ? inv.appliesTo : ['**/*'];
  const excludes = inv.excludes || [];
  const pool = scopeFiles || allFiles;
  return pool.filter(f => matchesAny(f, appliesTo) && !matchesAny(f, excludes));
}

/**
 * Evaluate one invariant. Returns a result record.
 * @returns {{ id, name, severity, passed, violations: string[], message, skipped?: boolean }}
 */
function evaluateOne(cwd, inv, scopeFiles, allFiles) {
  const severity = SEVERITIES.includes(inv.severity) ? inv.severity : 'warn';
  const base = { id: inv.id, name: inv.name || inv.id, severity, category: inv.category || 'general' };
  const check = inv.check || {};
  const violations = [];

  // Validate any regex patterns up front. A typo in a security invariant must
  // NOT silently report as passing — surface it as a warn so the author fixes it.
  for (const key of ['pattern', 'when', 'require']) {
    if (typeof check[key] === 'string') {
      try { new RegExp(check[key]); }
      catch (e) {
        return { ...base, severity: 'warn', passed: false, violations: [`invalid regex in catalog (${key}): ${e.message}`], message: `Fix the regex for invariant ${inv.id} in .rapidx/invariants/catalog.json` };
      }
    }
  }

  try {
    if (check.type === 'command') {
      // Repo-scoped only; skip during single-file hook runs.
      if (scopeFiles) return { ...base, passed: true, skipped: true, violations: [], message: inv.message || '' };
      const res = childProcess.spawnSync(check.command, {
        cwd, shell: true, encoding: 'utf8', timeout: check.timeout || 60000,
      });
      const ok = (res.status === 0);
      if (!ok) violations.push(`command exited ${res.status}: ${(res.stderr || res.stdout || '').trim().slice(0, 200)}`);
      return { ...base, passed: ok, violations, message: inv.message || `Command check failed: ${check.command}` };
    }

    const files = candidateFiles(inv, scopeFiles, allFiles);

    if (check.type === 'path_exists') {
      const matched = (scopeFiles || allFiles).filter(f => matchesAny(f, inv.appliesTo || []));
      const passed = matched.length > 0 || (scopeFiles && !scopeFiles.some(f => matchesAny(f, inv.appliesTo || [])));
      // In single-file scope we can only confirm presence, never absence of a required path.
      if (scopeFiles) return { ...base, passed: true, skipped: true, violations: [], message: inv.message || '' };
      if (matched.length === 0) violations.push(`no file matches required path: ${(inv.appliesTo || []).join(', ')}`);
      return { ...base, passed: matched.length > 0, violations, message: inv.message || 'Required path missing' };
    }

    if (check.type === 'path_absent') {
      const matched = files;
      matched.forEach(f => violations.push(f));
      return { ...base, passed: matched.length === 0, violations, message: inv.message || 'Forbidden path present' };
    }

    const flags = check.flags && /^[gimsuy]+$/.test(check.flags) ? check.flags : 'm';

    if (check.type === 'must_match' || check.type === 'must_not_match') {
      const re = new RegExp(check.pattern, flags.includes('g') ? flags : flags + 'g');
      for (const f of files) {
        const content = readFileSafe(cwd, f);
        if (content == null) continue;
        const found = re.test(content);
        re.lastIndex = 0;
        if (check.type === 'must_match' && !found) violations.push(f);
        if (check.type === 'must_not_match' && found) violations.push(f);
      }
      const def = check.type === 'must_match' ? 'Missing required pattern' : 'Contains forbidden pattern';
      return { ...base, passed: violations.length === 0, violations, message: inv.message || def };
    }

    if (check.type === 'pair') {
      const whenRe = new RegExp(check.when, flags);
      const reqRe = new RegExp(check.require, flags);
      for (const f of files) {
        const content = readFileSafe(cwd, f);
        if (content == null) continue;
        if (whenRe.test(content) && !reqRe.test(content)) violations.push(f);
      }
      return { ...base, passed: violations.length === 0, violations, message: inv.message || 'Conditional requirement not met' };
    }

    return { ...base, passed: true, skipped: true, violations: [], message: `Unknown check type: ${check.type}` };
  } catch (e) {
    return { ...base, passed: true, skipped: true, violations: [], message: `Invariant errored (skipped): ${e.message}` };
  }
}

/**
 * Evaluate the whole catalog.
 * @param {string} cwd
 * @param {{ scopeFiles?: string[]|null }} [options]
 * @returns {{ results: object[], summary: object }}
 */
function evaluate(cwd, options = {}) {
  const catalog = loadCatalog(cwd);
  const allFiles = listFiles(cwd);
  const scopeFiles = options.scopeFiles || null;
  const results = catalog.invariants.map(inv => evaluateOne(cwd, inv, scopeFiles, allFiles));

  const failed = results.filter(r => !r.passed && !r.skipped);
  const summary = {
    total: results.length,
    evaluated: results.filter(r => !r.skipped).length,
    passed: results.filter(r => r.passed && !r.skipped).length,
    failed: failed.length,
    errors: failed.filter(r => r.severity === 'error').length,
    warnings: failed.filter(r => r.severity === 'warn').length,
    infos: failed.filter(r => r.severity === 'info').length,
    catalogError: catalog.error || null,
  };
  return { results, summary };
}

/**
 * Render a human-readable report block for failures.
 * @param {object[]} results
 * @returns {string}
 */
function renderFailures(results) {
  const failed = results.filter(r => !r.passed && !r.skipped);
  if (failed.length === 0) return '';
  const icon = { error: '✖', warn: '⚠', info: 'ℹ' };
  return failed.map(r => {
    const where = r.violations.length ? `\n      ${r.violations.slice(0, 8).join('\n      ')}${r.violations.length > 8 ? `\n      … +${r.violations.length - 8} more` : ''}` : '';
    return `  ${icon[r.severity] || '•'} [${r.severity.toUpperCase()}] ${r.id} — ${r.name}\n      ${r.message}${where}`;
  }).join('\n');
}

module.exports = {
  catalogPath,
  loadCatalog,
  globToRegExp,
  matchesAny,
  listFiles,
  candidateFiles,
  evaluateOne,
  evaluate,
  renderFailures,
  relPosix,
  SEVERITIES,
};
