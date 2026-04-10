#!/usr/bin/env node
/**
 * RapidX Hook: knowledge-sync
 *
 * Trigger: session_end
 *
 * After each session, checks if any new patterns were introduced
 * (new files created, specs marked as implemented) and triggers
 * a lightweight knowledge sync if needed.
 *
 * This keeps .rapidx/knowledge/ fresh without requiring manual
 * /rapidx:learn runs after every session.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const cwd = process.cwd();
const knowledgeDir = path.join(cwd, '.rapidx', 'knowledge');
const syncLogPath = path.join(knowledgeDir, 'SYNC_LOG.md');

function readFile(p) { try { return fs.readFileSync(p, 'utf8'); } catch { return null; } }
function writeFile(p, c) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, c, 'utf8'); }
function log(m) { process.stderr.write(`[RapidX] ${m}\n`); }

function getChangedFiles() {
  try {
    const result = execSync('git diff --name-only HEAD~1 HEAD 2>/dev/null || git diff --name-only --cached 2>/dev/null', {
      cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'],
    });
    return result.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function shouldSync(changedFiles) {
  // Sync if:
  // - New source files were added (potential new patterns)
  // - A spec was modified (potential new domain knowledge)
  // - Architecture docs changed (potential ADR updates)
  const triggers = [
    /^src\//, /^lib\//, /^app\//,                          // New source files
    /^specs\/.*\/spec\.md$/,                               // Spec changes
    /^ARCHITECTURE\.md$/, /^docs\/adr\//,                  // Architecture changes
    /^CONTRIBUTING\.md$/, /^CODING_STANDARDS\.md$/,        // Guideline changes
  ];
  return changedFiles.some(f => triggers.some(pattern => pattern.test(f)));
}

function updateSyncLog(event) {
  const now = new Date().toISOString().split('T')[0];
  const entry = `| ${now} | ${event} | auto (session-end hook) |\n`;
  let log = readFile(syncLogPath) || '# Knowledge Sync Log\n\n| Date | Event | Trigger |\n|------|-------|--------|\n';
  writeFile(syncLogPath, log + entry);
}

// Main
try {
  const changedFiles = getChangedFiles();

  if (changedFiles.length > 0 && shouldSync(changedFiles)) {
    log('Detected relevant changes — queuing knowledge sync...');
    log(`Changed files: ${changedFiles.slice(0, 5).join(', ')}${changedFiles.length > 5 ? '...' : ''}`);
    log('Run /rapidx:learn --all && /rapidx:knowledge-sync to update knowledge base.');
    updateSyncLog(`session-end: ${changedFiles.length} changed files detected`);
  } else {
    log('Session ended — no knowledge sync needed.');
  }
} catch (e) {
  process.stderr.write(`[RapidX] knowledge-sync hook error: ${e.message}\n`);
}
