#!/usr/bin/env node
'use strict';

/**
 * RapidX Command Center — event emitter hook.
 *
 * No-ops immediately (near-zero cost) for every session that hasn't opted
 * into the command center via `/rapidx:command-center` (no
 * `.rapidx/command/identity.json` and no `RAPIDX_CORRELATION_ID` env var),
 * so this is safe to leave registered.
 *
 * Called as `node .rapidx/hooks/command-emit.js <event_type>` from
 * SessionStart/PostToolUse/Notification/Stop/SubagentStop, per the wiring
 * `init-hooks.js` writes into `.claude/settings.json` — matches the
 * `rapidx-emit <event_type>` calling convention from the command-center
 * spec.
 *
 * Fire-and-forget, fail-open: a short-timeout POST to the shared collector,
 * always exits 0. A telemetry outage must never stall a build.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const crypto = require('crypto');
const { execSync } = require('child_process');

function stripBom(str) {
  return str.charCodeAt(0) === 0xfeff ? str.slice(1) : str;
}

const eventType = process.argv[2] || 'tool_use';
const cwd = process.cwd();
const identityPath = path.join(cwd, '.rapidx', 'command', 'identity.json');
const commandHome = path.join(os.homedir(), '.rapidx-command');
const stateFile = path.join(commandHome, '.state.json');

let identity = null;
if (process.env.RAPIDX_CORRELATION_ID) {
  identity = {
    correlation_id: process.env.RAPIDX_CORRELATION_ID,
    repo: process.env.RAPIDX_REPO || path.basename(cwd),
    agent_id: process.env.RAPIDX_AGENT_ID || null,
    branch: null,
  };
} else if (fs.existsSync(identityPath)) {
  try { identity = JSON.parse(stripBom(fs.readFileSync(identityPath, 'utf8'))); } catch (_) { identity = null; }
}

// Not opted in — exit before touching stdin or doing any real work.
if (!identity || !identity.correlation_id) {
  process.exit(0);
}

let inputData = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { inputData += chunk; });
process.stdin.on('end', () => {
  const finish = () => process.exit(0);
  const hardStop = setTimeout(finish, 400);
  hardStop.unref();

  try {
    send(buildEvent());
  } catch (_) {
    finish();
    return;
  }
});

// If stdin never closes for some reason, still exit fast rather than hang the tool call.
setTimeout(() => process.exit(0), 500).unref();

function readPort() {
  try {
    const state = JSON.parse(stripBom(fs.readFileSync(stateFile, 'utf8')));
    return state.port || null;
  } catch (_) { return null; }
}

function currentPhase() {
  try {
    const manifestPath = path.join(cwd, '.rapidx', 'loop', 'manifest.json');
    const manifest = JSON.parse(stripBom(fs.readFileSync(manifestPath, 'utf8')));
    return manifest.current_phase === undefined ? null : manifest.current_phase;
  } catch (_) { return null; }
}

function currentBranch() {
  if (identity.branch) return identity.branch;
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { cwd, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch (_) { return null; }
}

function summarize(hookInput) {
  const toolName = hookInput.tool_name;
  const toolInput = hookInput.tool_input || {};
  if (eventType === 'session_start') return 'Session started.';
  if (eventType === 'session_end' || eventType === 'subagent_end') return 'Session ended.';
  if (eventType === 'escalation') {
    const msg = hookInput.message || (hookInput.tool_response && hookInput.tool_response.message);
    return (msg ? String(msg) : 'Agent is waiting on a decision.').slice(0, 300);
  }
  if (!toolName) return eventType;
  const target = toolInput.file_path || toolInput.command || toolInput.path || '';
  return `${toolName}${target ? ': ' + String(target).slice(0, 160) : ''}`;
}

function buildEvent() {
  let hookInput = {};
  try { hookInput = JSON.parse(stripBom(inputData || '{}')); } catch (_) { hookInput = {}; }

  return {
    schema: 'rapidx.agent.event/v1',
    event_id: crypto.randomUUID(),
    ts: new Date().toISOString(),
    correlation_id: identity.correlation_id,
    session_id: hookInput.session_id || null,
    tool: 'claude-code',
    agent_id: identity.agent_id || identity.correlation_id,
    repo: identity.repo || path.basename(cwd),
    branch: currentBranch(),
    phase: currentPhase(),
    loop: null,
    event_type: eventType,
    status: 'ok',
    actor: 'agent',
    payload: {
      tool_name: hookInput.tool_name || null,
      file_path: (hookInput.tool_input && hookInput.tool_input.file_path) || null,
      summary: summarize(hookInput),
    },
  };
}

function send(evt) {
  const port = readPort();
  if (!port) { process.exit(0); return; }

  const body = Buffer.from(JSON.stringify(evt));
  const req = http.request({
    host: '127.0.0.1', port, path: '/events', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': body.length },
    timeout: 250,
  }, (res) => { res.resume(); res.on('end', () => process.exit(0)); });
  req.on('error', () => process.exit(0));
  req.on('timeout', () => { req.destroy(); process.exit(0); });
  req.write(body);
  req.end();
}
