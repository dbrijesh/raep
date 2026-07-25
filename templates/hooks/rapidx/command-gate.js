#!/usr/bin/env node
'use strict';

/**
 * RapidX Command Center — interrupt gate hook (PreToolUse).
 *
 * The only command-center hook allowed to block. No-ops immediately for
 * every session that hasn't opted in (same identity resolution as
 * `command-emit.js`). Otherwise reads control state directly off disk —
 * `~/.rapidx-command/data/control/<correlation_id>.json` — rather than
 * calling the collector over HTTP, so a paused/killed run stays blocked
 * even if the collector process itself is down, and so this never adds
 * network latency to every tool call in the common (running) case.
 *
 * Blocking uses the structured JSON deny form on stdout (preferred over
 * bare `exit 2` per the command-center spec — the reason is then surfaced
 * to the model cleanly instead of as a raw stderr error), and the reason
 * string is written as an instruction the agent should follow, not an
 * error message.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

function stripBom(str) {
  return str.charCodeAt(0) === 0xfeff ? str.slice(1) : str;
}

const cwd = process.cwd();
const identityPath = path.join(cwd, '.rapidx', 'command', 'identity.json');
const controlDir = path.join(os.homedir(), '.rapidx-command', 'data', 'control');

let correlationId = process.env.RAPIDX_CORRELATION_ID || null;
if (!correlationId && fs.existsSync(identityPath)) {
  try {
    const identity = JSON.parse(stripBom(fs.readFileSync(identityPath, 'utf8')));
    correlationId = identity.correlation_id || null;
  } catch (_) { correlationId = null; }
}

if (!correlationId) {
  process.exit(0);
}

let control = null;
try {
  control = JSON.parse(stripBom(fs.readFileSync(path.join(controlDir, `${correlationId}.json`), 'utf8')));
} catch (_) {
  control = null;
}

if (!control || control.status === 'running') {
  process.exit(0);
}

const reasons = {
  paused: control.reason ||
    'Fleet control has paused this run pending human review. Do not retry the tool call — wait for a "resume" action from the RapidX Command console.',
  killed: control.reason ||
    'Fleet control has stopped this run from the console. Do not retry any further tool calls. ' +
    '(Note: this blocks future tool calls only — it does not terminate the underlying process. ' +
    'If a person is watching, they will end the session directly.)',
};
const reason = reasons[control.status] || `Fleet control set this run to "${control.status}". Do not proceed.`;

process.stdout.write(JSON.stringify({ decision: 'block', reason }));
process.exit(2);
