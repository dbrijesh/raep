#!/usr/bin/env node
'use strict';

/**
 * RapidX Session End Hook
 * Writes a session summary entry to the audit log at the end of each session.
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
    // No stack.json — skip
  }

  // Count audit entries for this session to summarise activity
  let sessionEventCount = 0;
  try {
    const log = fs.readFileSync(AUDIT_LOG, 'utf8');
    sessionEventCount = log.split('\n')
      .filter(l => l.trim())
      .filter(l => {
        try { return JSON.parse(l).session_id === sessionId; } catch (_) { return false; }
      }).length;
  } catch (_) {
    // Log doesn't exist yet
  }

  // Write session-end audit entry
  const entry = {
    ts: new Date().toISOString(),
    hook: 'session-end',
    event: 'session_end',
    session_id: sessionId,
    profile: profile,
    session_event_count: sessionEventCount,
  };

  try {
    fs.mkdirSync(path.dirname(AUDIT_LOG), { recursive: true });
    fs.appendFileSync(AUDIT_LOG, JSON.stringify(entry) + '\n', 'utf8');
  } catch (_) {}

  process.exit(0);
});
