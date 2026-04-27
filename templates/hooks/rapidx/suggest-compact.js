#!/usr/bin/env node
'use strict';

/**
 * RapidX Suggest Compact Hook
 * Reads context usage metadata from Claude's post_tool_use event.
 * Writes a suggestion to stderr when context usage exceeds 70%.
 *
 * Claude Code exposes context metrics in the hook event JSON under
 * `context_usage_fraction` (0.0–1.0) when available.
 */

const THRESHOLD = 0.70;

let inputData = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { inputData += chunk; });
process.stdin.on('end', () => {
  let event = {};
  try {
    event = JSON.parse(inputData);
  } catch (_) {
    process.exit(0);
  }

  // context_usage_fraction is provided by Claude Code in post_tool_use events
  const usage = event.context_usage_fraction;
  if (typeof usage !== 'number') {
    process.exit(0);
  }

  if (usage >= THRESHOLD) {
    const pct = Math.round(usage * 100);
    process.stderr.write(
      `[RapidX] Context is ${pct}% full. Consider running /compact to summarise and free context before continuing.\n`
    );
  }

  process.exit(0);
});
