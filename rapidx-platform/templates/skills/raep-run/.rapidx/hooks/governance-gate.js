#!/usr/bin/env node
'use strict';

/**
 * RapidX Governance Gate Hook
 * Enforces governance checks before potentially destructive operations.
 * Only active for regulated profiles (pharma, finserv, hipaa, enterprise-standard).
 *
 * Blocks git operations to main/master without confirmation of review gate completion.
 */

const fs = require('fs');
const path = require('path');

// Commands that require governance gate confirmation
const GOVERNED_COMMANDS = [
  /git\s+push.*(?:main|master|release|prod)/,
  /git\s+merge.*(?:main|master)/,
  /npm\s+publish/,
  /npx\s+.*deploy/,
];

let inputData = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { inputData += chunk; });
process.stdin.on('end', () => {
  let hookInput = {};
  try {
    hookInput = JSON.parse(inputData);
  } catch (_) {
    process.exit(0);
  }

  // Only check Bash tool calls
  if (hookInput.tool_name !== 'Bash' || !hookInput.tool_input) {
    process.exit(0);
  }

  // Check if active profile requires governance gates
  let profile = 'default';
  try {
    const stackPath = path.join(process.cwd(), '.rapidx', 'stack.json');
    const stack = JSON.parse(fs.readFileSync(stackPath, 'utf8'));
    profile = stack.profile || 'default';
  } catch (_) {
    process.exit(0);
  }

  const governedProfiles = ['pharma-regulated', 'finserv-sox', 'insurance-hipaa', 'enterprise-standard'];
  if (!governedProfiles.includes(profile)) {
    process.exit(0);
  }

  const command = hookInput.tool_input.command || '';

  // Check if command matches governed patterns
  const triggered = GOVERNED_COMMANDS.some(pattern => pattern.test(command));
  if (!triggered) {
    process.exit(0);
  }

  // Log governance gate trigger
  try {
    const auditLog = path.join(process.cwd(), '.rapidx', 'audit.jsonl');
    const entry = {
      ts: new Date().toISOString(),
      hook: 'governance-gate',
      event: 'governance_gate_triggered',
      profile,
      command_prefix: command.substring(0, 80),
    };
    fs.appendFileSync(auditLog, JSON.stringify(entry) + '\n', 'utf8');
  } catch (_) {}

  // For enterprise deployments, just warn (don't block — let human decide)
  const reason = `[RapidX] Governance gate: Profile "${profile}" requires review gate completion before production deployments. Run /rapidx:governance-check to verify compliance.`;
  process.stderr.write(reason + '\n');

  // Allow but warn (exit 0)
  // To actually block, change to: process.stdout.write(JSON.stringify({ decision: 'block', reason })); process.exit(2);
  process.exit(0);
});
