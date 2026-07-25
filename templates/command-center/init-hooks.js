'use strict';

/**
 * RapidX Command — per-repo opt-in.
 *
 * Run once per repo (by `/rapidx:command-center`, from inside that repo's
 * working directory — `cwd` is trusted as the repo root). Two effects:
 *
 *  1. Registers `command-emit`/`command-gate` into THIS repo's
 *     `.claude/settings.json`, additively — existing hooks/permissions are
 *     never touched or removed. This is the explicit runtime opt-in the
 *     plan calls for: the hook files themselves are already shipped to
 *     every install's `.rapidx/hooks/`, but nothing calls them until this
 *     runs.
 *  2. Writes `.rapidx/command/identity.json` once, so plain interactive
 *     sessions in this repo have a stable `correlation_id` to report under
 *     without needing the (later) dispatch mechanism to stamp one.
 *
 * Self-contained: this file is invoked from the shared home-dir copy
 * (`~/.rapidx-command/init-hooks.js`), not from node_modules, so it must
 * not `require()` anything from the rapidx-platform package itself.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const cwd = process.cwd();
const claudeDir = path.join(cwd, '.claude');
const settingsPath = path.join(claudeDir, 'settings.json');
const rapidxCommandDir = path.join(cwd, '.rapidx', 'command');
const identityPath = path.join(rapidxCommandDir, 'identity.json');

const HOOK_REGISTRATIONS = [
  { event: 'SessionStart', matcher: undefined, command: 'node .rapidx/hooks/command-emit.js session_start' },
  { event: 'PreToolUse', matcher: '.*', command: 'node .rapidx/hooks/command-gate.js' },
  { event: 'PostToolUse', matcher: '.*', command: 'node .rapidx/hooks/command-emit.js tool_use' },
  { event: 'Notification', matcher: undefined, command: 'node .rapidx/hooks/command-emit.js escalation' },
  { event: 'Stop', matcher: undefined, command: 'node .rapidx/hooks/command-emit.js session_end' },
  { event: 'SubagentStop', matcher: undefined, command: 'node .rapidx/hooks/command-emit.js subagent_end' },
];

function readJsonSafe(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, '')); } catch (_) { return fallback; }
}

function mergeSettings() {
  fs.mkdirSync(claudeDir, { recursive: true });
  const settings = readJsonSafe(settingsPath, {});
  settings.hooks = settings.hooks || {};

  let added = 0;
  for (const reg of HOOK_REGISTRATIONS) {
    settings.hooks[reg.event] = settings.hooks[reg.event] || [];
    const bucket = settings.hooks[reg.event];

    // Find (or create) the entry matching this matcher, then dedupe by command string.
    let entry = bucket.find((e) => (e.matcher || undefined) === reg.matcher);
    if (!entry) {
      entry = reg.matcher !== undefined ? { matcher: reg.matcher, hooks: [] } : { hooks: [] };
      bucket.push(entry);
    }
    entry.hooks = entry.hooks || [];
    const exists = entry.hooks.some((h) => h.command === reg.command);
    if (!exists) {
      entry.hooks.push({ type: 'command', command: reg.command });
      added++;
    }
  }

  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
  return added;
}

function deriveRepoName() {
  try {
    const url = execSync('git remote get-url origin', { cwd, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    const m = url.match(/[:/]([^/]+\/[^/]+?)(\.git)?$/);
    if (m) return m[1];
  } catch (_) { /* no remote / not a git repo */ }
  return path.basename(cwd);
}

function deriveBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { cwd, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch (_) { return null; }
}

function ensureIdentity() {
  fs.mkdirSync(rapidxCommandDir, { recursive: true });
  const existing = readJsonSafe(identityPath, null);
  if (existing && existing.correlation_id) return existing;

  const repo = deriveRepoName();
  const identity = {
    correlation_id: `run_${repo.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}_${crypto.randomBytes(3).toString('hex')}`,
    repo,
    agent_id: `${repo}-interactive`,
    branch: deriveBranch(),
    created_at: new Date().toISOString(),
  };
  fs.writeFileSync(identityPath, JSON.stringify(identity, null, 2), 'utf8');
  return identity;
}

const identity = ensureIdentity();
const added = mergeSettings();
process.stdout.write(
  `[RapidX Command] opted in "${identity.repo}" (correlation_id=${identity.correlation_id}), ` +
  `${added} hook registration(s) added to .claude/settings.json\n`
);
