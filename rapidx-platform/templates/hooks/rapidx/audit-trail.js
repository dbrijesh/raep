#!/usr/bin/env node
'use strict';

/**
 * RapidX Audit Trail Hook
 * Writes significant events to .rapidx/audit.jsonl (append-only JSONL log).
 *
 * Hook input is provided via stdin as JSON:
 * {
 *   "hook_event_name": "PostToolUse",
 *   "tool_name": "Write",
 *   "tool_input": { ... },
 *   "tool_response": { ... }
 * }
 */

const fs = require('fs');
const path = require('path');

const AUDIT_LOG = path.join(process.cwd(), '.rapidx', 'audit.jsonl');
const AUDIT_DIR = path.dirname(AUDIT_LOG);

// Ensure audit directory exists
try {
  fs.mkdirSync(AUDIT_DIR, { recursive: true });
} catch (_) {}

// Read hook input from stdin
let inputData = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { inputData += chunk; });
process.stdin.on('end', () => {
  let hookInput = {};
  try {
    hookInput = JSON.parse(inputData);
  } catch (_) {
    // Empty or invalid input — still write a heartbeat entry
  }

  const event = {
    ts: new Date().toISOString(),
    hook: 'audit-trail',
    event: hookInput.hook_event_name || 'unknown',
    tool: hookInput.tool_name || null,
    session_id: process.env.CLAUDE_SESSION_ID || null,
    profile: readCurrentProfile(),
  };

  // Add tool-specific details
  if (hookInput.tool_name === 'Write' && hookInput.tool_input) {
    event.file = hookInput.tool_input.file_path || null;
  } else if (hookInput.tool_name === 'Bash' && hookInput.tool_input) {
    // Only log the command prefix, not full content (may contain secrets)
    const cmd = hookInput.tool_input.command || '';
    event.command_prefix = cmd.substring(0, 80);
  }

  // Append to JSONL
  try {
    fs.appendFileSync(AUDIT_LOG, JSON.stringify(event) + '\n', 'utf8');
  } catch (e) {
    process.stderr.write(`[RapidX] Audit trail write failed: ${e.message}\n`);
  }

  // Exit cleanly — do not block the tool use
  process.exit(0);
});

function readCurrentProfile() {
  try {
    const stackPath = path.join(process.cwd(), '.rapidx', 'stack.json');
    const stack = JSON.parse(fs.readFileSync(stackPath, 'utf8'));
    return stack.profile || 'default';
  } catch (_) {
    return 'unknown';
  }
}
