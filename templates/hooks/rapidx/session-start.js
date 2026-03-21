#!/usr/bin/env node
'use strict';

/**
 * RapidX Session Start Hook
 * Loads profile and tech stack context at the start of each session.
 * Writes a session start entry to the audit log.
 */

const fs = require('fs');
const path = require('path');

const AUDIT_LOG = path.join(process.cwd(), '.rapidx', 'audit.jsonl');

let inputData = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { inputData += chunk; });
process.stdin.on('end', () => {
  const sessionId = process.env.CLAUDE_SESSION_ID || `session-${Date.now()}`;

  // Try to read current stack config
  let stack = {};
  let profile = 'default';
  try {
    const stackPath = path.join(process.cwd(), '.rapidx', 'stack.json');
    stack = JSON.parse(fs.readFileSync(stackPath, 'utf8'));
    profile = stack.profile || 'default';
  } catch (_) {
    // No stack.json — new installation or not installed
  }

  // Write audit entry
  const entry = {
    ts: new Date().toISOString(),
    hook: 'session-start',
    event: 'session_start',
    session_id: sessionId,
    profile: profile,
    stack_configured: Object.keys(stack).length > 0,
    installed_skills: stack.installed_components ? stack.installed_components.skills : [],
  };

  try {
    fs.mkdirSync(path.dirname(AUDIT_LOG), { recursive: true });
    fs.appendFileSync(AUDIT_LOG, JSON.stringify(entry) + '\n', 'utf8');
  } catch (_) {}

  // Output context injection (printed to stdout for Claude to read)
  if (Object.keys(stack).length > 0) {
    const fe = stack.frontend || {};
    const be = stack.backend || {};
    const db = stack.database || {};

    const contextLines = [
      `[RapidX] Session started — Profile: ${profile}`,
    ];

    if (fe.framework) contextLines.push(`  Frontend: ${fe.framework}${fe.version ? ' ' + fe.version : ''}`);
    if (be.language) contextLines.push(`  Backend: ${be.language}${be.language_version ? ' ' + be.language_version : ''}${be.framework ? ' + ' + be.framework : ''}`);
    if (db.primary) contextLines.push(`  Database: ${db.primary}${db.primary_version ? ' ' + db.primary_version : ''}`);

    if (stack.installed_components) {
      const { skills } = stack.installed_components;
      if (skills && skills.length) {
        contextLines.push(`  Active skills: ${skills.slice(0, 6).join(', ')}${skills.length > 6 ? '...' : ''}`);
      }
    }

    process.stderr.write(contextLines.join('\n') + '\n');
  }

  process.exit(0);
});
