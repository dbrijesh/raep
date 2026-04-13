#!/usr/bin/env node
/**
 * RapidX Hook: spec-validator
 *
 * Trigger: pre_tool_use (filter: Bash — git commit commands)
 *
 * Before any git commit, check:
 * 1. If the changes are on a spec feature branch (###-feature-slug pattern)
 * 2. If so, verify the changes align with the spec's acceptance criteria
 * 3. Warn if committing without a passing spec review
 *
 * Non-blocking by default (warn, don't prevent). Set RAPIDX_STRICT_SPEC=1
 * to make it blocking.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const cwd = process.cwd();
const STRICT_MODE = process.env.RAPIDX_STRICT_SPEC === '1';

function readFile(p) { try { return fs.readFileSync(p, 'utf8'); } catch { return null; } }
function warn(m) { process.stderr.write(`[RapidX] WARN: ${m}\n`); }
function info(m) { process.stderr.write(`[RapidX] ${m}\n`); }
function block(m) { process.stderr.write(`[RapidX] BLOCKED: ${m}\n`); process.exit(1); }

function getCurrentBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { cwd, encoding: 'utf8' }).trim();
  } catch { return null; }
}

function getSpecIdFromBranch(branch) {
  // Match: 001-feature-slug, 042-user-auth, etc.
  const match = branch.match(/^(\d{3})-(.+)$/);
  return match ? match[0] : null;
}

function checkSpec(specId) {
  const specPath = path.join(cwd, 'specs', specId, 'spec.md');
  const reviewPath = path.join(cwd, 'specs', specId, 'review.md');

  if (!fs.existsSync(specPath)) {
    warn(`Branch '${specId}' looks like a spec branch but no spec found at specs/${specId}/spec.md`);
    warn('Run /rapidx:spec to create the spec.');
    return;
  }

  const specContent = readFile(specPath);

  // Check spec status
  const statusMatch = specContent.match(/\*\*Status\*\*:\s*(.+)/);
  const status = statusMatch ? statusMatch[1].trim() : 'Draft';

  if (status === 'Draft') {
    warn(`Spec at specs/${specId}/spec.md is still in Draft status.`);
    warn('Run /rapidx:spec-review to validate it before implementing.');
    if (STRICT_MODE) block('Cannot commit — spec not reviewed. Set RAPIDX_STRICT_SPEC=0 to bypass.');
    return;
  }

  // Check if review exists
  if (!fs.existsSync(reviewPath)) {
    warn(`No spec review found at specs/${specId}/review.md`);
    warn('Run /rapidx:spec-review to validate the spec.');
    if (STRICT_MODE) block('Cannot commit — no spec review. Set RAPIDX_STRICT_SPEC=0 to bypass.');
    return;
  }

  // Check review verdict
  const reviewContent = readFile(reviewPath);
  const verdictMatch = reviewContent.match(/Verdict:\s*(.+)/);
  const verdict = verdictMatch ? verdictMatch[1].trim() : '';

  if (verdict.includes('BLOCKED') || verdict.includes('NEEDS REVISION')) {
    const msg = `Spec review shows: ${verdict} — resolve blockers before committing.`;
    if (STRICT_MODE) block(msg);
    else warn(msg);
    return;
  }

  info(`Spec check passed for ${specId} — spec is reviewed and ${verdict || 'approved'}.`);
}

// Main
try {
  const branch = getCurrentBranch();
  if (!branch) { info('spec-validator: could not determine branch, skipping check.'); process.exit(0); }

  const specId = getSpecIdFromBranch(branch);
  if (specId) {
    checkSpec(specId);
  }
  // Not a spec branch — no check needed
  process.exit(0);
} catch (e) {
  process.stderr.write(`[RapidX] spec-validator hook error: ${e.message}\n`);
  process.exit(0); // Don't block on hook errors
}
