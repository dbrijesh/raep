#!/usr/bin/env node
'use strict';

/**
 * RapidX Token Tracker Hook
 * Feeds the /rapidx:loop live dashboard's "Tokens Used" counter.
 *
 * No-ops immediately (near-zero cost) for every session that isn't running
 * a /rapidx:loop engagement, so this is safe to leave enabled globally.
 *
 * Claude Code's PostToolUse hook input includes `transcript_path` — the
 * current session's own JSONL transcript, where each assistant turn entry
 * carries a `message.usage` object (input_tokens/output_tokens/
 * cache_creation_input_tokens/cache_read_input_tokens). This hook tails
 * that file (byte-offset tracked per transcript so repeat calls only parse
 * new lines) and accumulates a running total into `.rapidx/loop/tokens.json`,
 * bucketed by the loop's current phase from manifest.json. Best-effort only:
 * if the transcript doesn't match the expected shape, this silently no-ops
 * rather than blocking the tool call or corrupting tokens.json.
 */

const fs = require('fs');
const path = require('path');

// A UTF-8 BOM (e.g. from a file saved by an editor/shell that adds one on
// Windows) makes JSON.parse throw; strip it defensively so a stray BOM in
// manifest.json or the hook's own stdin never silently misfiles tokens into
// the "unassigned" bucket instead of the real current phase.
function stripBom(str) {
  return str.charCodeAt(0) === 0xfeff ? str.slice(1) : str;
}

const LOOP_DIR = path.join(process.cwd(), '.rapidx', 'loop');
const MANIFEST_FILE = path.join(LOOP_DIR, 'manifest.json');
const TOKENS_FILE = path.join(LOOP_DIR, 'tokens.json');

// No loop engagement configured in this directory — nothing to track.
if (!fs.existsSync(MANIFEST_FILE)) {
  process.exit(0);
}

let inputData = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { inputData += chunk; });
process.stdin.on('end', () => {
  try {
    run();
  } catch (_) {
    // Never block the tool call over a tracking failure.
  }
  process.exit(0);
});

function run() {
  let hookInput = {};
  try { hookInput = JSON.parse(stripBom(inputData)); } catch (_) { return; }

  const transcriptPath = hookInput.transcript_path;
  if (!transcriptPath || !fs.existsSync(transcriptPath)) return;

  const emptyTotals = () => ({ input: 0, output: 0, cache_read: 0, cache_creation: 0, sum: 0 });

  let state = { total: emptyTotals(), by_phase: {}, _offsets: {} };
  try {
    const existing = JSON.parse(stripBom(fs.readFileSync(TOKENS_FILE, 'utf8')));
    if (existing && typeof existing === 'object') {
      state.total = Object.assign(emptyTotals(), existing.total);
      state.by_phase = existing.by_phase || {};
      state._offsets = existing._offsets || {};
    }
  } catch (_) { /* first run — start fresh */ }

  const stat = fs.statSync(transcriptPath);
  const lastOffset = state._offsets[transcriptPath] || 0;
  if (stat.size <= lastOffset) return; // nothing new (or file rotated smaller — skip this tick)

  const fd = fs.openSync(transcriptPath, 'r');
  const len = stat.size - lastOffset;
  const buf = Buffer.alloc(len);
  fs.readSync(fd, buf, 0, len, lastOffset);
  fs.closeSync(fd);

  const chunk = buf.toString('utf8');
  const lastNewline = chunk.lastIndexOf('\n');
  if (lastNewline === -1) return; // no complete line yet — wait for next tool call

  const completeChunk = chunk.slice(0, lastNewline);
  state._offsets[transcriptPath] = lastOffset + Buffer.byteLength(completeChunk, 'utf8') + 1;

  let manifest = { current_phase: null };
  try { manifest = JSON.parse(stripBom(fs.readFileSync(MANIFEST_FILE, 'utf8'))); } catch (_) { /* keep default */ }
  const phaseKey = manifest.current_phase === null || manifest.current_phase === undefined
    ? 'unassigned'
    : String(manifest.current_phase);
  if (!state.by_phase[phaseKey]) state.by_phase[phaseKey] = emptyTotals();

  let changed = false;
  completeChunk.split('\n').forEach((line) => {
    if (!line) return;
    let entry;
    try { entry = JSON.parse(line); } catch (_) { return; }
    const usage = entry && entry.type === 'assistant' && entry.message && entry.message.usage;
    if (!usage) return;

    const input = usage.input_tokens || 0;
    const output = usage.output_tokens || 0;
    const cacheRead = usage.cache_read_input_tokens || 0;
    const cacheCreation = usage.cache_creation_input_tokens || 0;
    const sum = input + output + cacheRead + cacheCreation;
    if (!sum) return;

    state.total.input += input;
    state.total.output += output;
    state.total.cache_read += cacheRead;
    state.total.cache_creation += cacheCreation;
    state.total.sum += sum;

    state.by_phase[phaseKey].input += input;
    state.by_phase[phaseKey].output += output;
    state.by_phase[phaseKey].cache_read += cacheRead;
    state.by_phase[phaseKey].cache_creation += cacheCreation;
    state.by_phase[phaseKey].sum += sum;

    changed = true;
  });

  if (!changed) {
    // Still persist the advanced offset so we don't reparse the same lines.
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(state, null, 2), 'utf8');
    return;
  }

  const output = {
    updated_at: new Date().toISOString(),
    current_phase: manifest.current_phase === undefined ? null : manifest.current_phase,
    total: state.total,
    by_phase: state.by_phase,
    _offsets: state._offsets,
  };
  fs.writeFileSync(TOKENS_FILE, JSON.stringify(output, null, 2), 'utf8');
}
