#!/usr/bin/env node
/**
 * RapidX Hook: codebase-context
 *
 * Trigger: session_start
 *
 * Injects codebase knowledge context at the start of every AI session.
 * Reads .rapidx/knowledge/ and .rapidx/stack.json to build a rich
 * context block that all agents receive automatically.
 *
 * This means agents don't need to be told about the codebase —
 * they already know the patterns, architecture, and guidelines.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const cwd = process.cwd();
const knowledgeDir = path.join(cwd, '.rapidx', 'knowledge');
const stackPath = path.join(cwd, '.rapidx', 'stack.json');

function readFile(filePath) {
  try { return fs.readFileSync(filePath, 'utf8'); } catch { return null; }
}

function buildContextBlock() {
  const stack = JSON.parse(readFile(stackPath) || '{}');
  const lines = ['## RapidX Session Context\n'];

  // Tech stack summary
  if (Object.keys(stack).length > 0) {
    lines.push('### Active Tech Stack');
    if (stack.frontend?.framework) lines.push(`- Frontend: ${stack.frontend.framework}@${stack.frontend.version || 'latest'}`);
    if (stack.backend?.language) lines.push(`- Backend: ${stack.backend.language}@${stack.backend.runtime_version || 'latest'} ${stack.backend.framework ? `/ ${stack.backend.framework}` : ''}`);
    if (stack.database?.primary) lines.push(`- Database: ${stack.database.primary}@${stack.database.primary_version || 'latest'} ${stack.database.orm ? `via ${stack.database.orm}` : ''}`);
    lines.push('');
    lines.push('**Version constraint**: Only use features available in the above versions.');
    lines.push('');
  }

  // Knowledge summaries
  const knowledgeFiles = [
    { file: 'code-patterns.md', label: 'Code Patterns' },
    { file: 'architecture.md', label: 'Architecture' },
    { file: 'guidelines.md', label: 'Guidelines' },
    { file: 'anti-patterns.md', label: 'Anti-Patterns (Avoid)' },
  ];

  for (const { file, label } of knowledgeFiles) {
    const content = readFile(path.join(knowledgeDir, file));
    if (content) {
      // Include first 30 lines of each knowledge file
      const summary = content.split('\n').slice(0, 30).join('\n');
      lines.push(`### ${label}`);
      lines.push(summary);
      lines.push('');
    }
  }

  // Constitution
  const constitution = readFile(path.join(cwd, '.rapidx', 'CONSTITUTION.md'))
    || readFile(path.join(cwd, 'docs', 'CONSTITUTION.md'));
  if (constitution) {
    lines.push('### Constitution (Non-negotiable principles)');
    lines.push(constitution.split('\n').slice(0, 20).join('\n'));
    lines.push('');
  }

  // Active spec
  const planningConfig = JSON.parse(readFile(path.join(cwd, '.planning', 'config.json')) || '{}');
  if (planningConfig.active_spec) {
    lines.push(`### Active Feature Spec: ${planningConfig.active_spec}`);
    lines.push(`Spec: ${planningConfig.spec_path || `specs/${planningConfig.active_spec}/spec.md`}`);
    lines.push(`Plan: ${planningConfig.plan_path || `specs/${planningConfig.active_spec}/plan.md`}`);
    lines.push('');
  }

  lines.push('---');
  lines.push('Refresh context: /rapidx:learn | Fine-tune: /rapidx:fine-tune | Sync: /rapidx:knowledge-sync');

  return lines.join('\n');
}

// Output context to stdout — Claude Code injects this at session start
try {
  const context = buildContextBlock();
  process.stdout.write(context + '\n');
} catch (e) {
  process.stderr.write(`[RapidX] codebase-context hook error: ${e.message}\n`);
}
