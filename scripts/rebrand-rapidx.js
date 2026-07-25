#!/usr/bin/env node
'use strict';

/**
 * RapidX Branding Sweep
 * ---------------------
 * Removes residual upstream branding from installable CONTENT so everything the
 * user sees is "RapidX". Deliberately SURGICAL:
 *
 *   - Rewrites the title-case product phrases and the GTD acronym in prose.
 *   - Leaves lowercase path/structural tokens alone (`get-things-done/` is the
 *     vendored engine directory; `.claude/` etc. are real platform paths).
 *   - Preserves external URLs (github.com/...) so source links keep working.
 *   - Keeps real platform/product names: "Claude Code", "Copilot", "Cursor",
 *     "Codex", "OpenCode", "Antigravity", "Kiro".
 *
 * Run: node scripts/rebrand-rapidx.js [--check]
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TARGET_DIRS = ['templates', 'get-things-done'];
const TEXT_EXTS = new Set(['.md', '.txt', '.mdc']);
const CHECK_ONLY = process.argv.includes('--check');

// URL-safe replacements. Order matters (specific → general).
const REWRITES = [
  [/GTD\/RapidX/g, 'RapidX'],
  [/RapidX\/RapidX/g, 'RapidX'],
  [/Get Things Done workflow engine/g, 'RapidX workflow engine'],
  [/Get Things Done workflow/g, 'RapidX workflow'],
  [/the Get Things Done/g, 'RapidX'],
  [/Get Things Done/g, 'RapidX'],
  [/Get Shit Done/g, 'RapidX'],
  // GTD acronym in prose → RapidX (word-boundary; lowercase 'gtd' paths untouched)
  [/\bGTD\b/g, 'RapidX'],
  // Clean up doubled product name introduced by the above
  [/RapidX RapidX/g, 'RapidX'],
];

/**
 * Apply rewrites to a single line, skipping any line that contains an external
 * URL so we never corrupt source links.
 */
function rewriteLine(line) {
  if (/https?:\/\//.test(line)) return line;
  let out = line;
  for (const [re, rep] of REWRITES) out = out.replace(re, rep);
  return out;
}

function rewrite(content) {
  return content.split('\n').map(rewriteLine).join('\n');
}

let scanned = 0, changed = 0;
const changedFiles = [];

function walk(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '.git') continue;
      walk(full);
    } else if (TEXT_EXTS.has(path.extname(e.name).toLowerCase())) {
      scanned++;
      const orig = fs.readFileSync(full, 'utf8');
      const updated = rewrite(orig);
      if (updated !== orig) {
        changed++;
        changedFiles.push(path.relative(ROOT, full));
        if (!CHECK_ONLY) fs.writeFileSync(full, updated, 'utf8');
      }
    }
  }
}

for (const d of TARGET_DIRS) walk(path.join(ROOT, d));

process.stdout.write(`${CHECK_ONLY ? '[check] ' : ''}Scanned ${scanned} files, ${CHECK_ONLY ? 'would change' : 'changed'} ${changed}.\n`);
changedFiles.slice(0, 40).forEach(f => process.stdout.write(`  ${f}\n`));
if (changedFiles.length > 40) process.stdout.write(`  … +${changedFiles.length - 40} more\n`);
