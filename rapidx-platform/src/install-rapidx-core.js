'use strict';

/**
 * RapidX Core Runtime Installer
 * -----------------------------
 * Lays down the platform-NEUTRAL `.rapidx/` runtime that every supported tool
 * shares, regardless of which IDE/CLI the user selected:
 *
 *   .rapidx/hooks/lib/invariants.cjs    — invariant engine (zero-dep)
 *   .rapidx/hooks/lib/graph-query.cjs   — knowledge-graph query API
 *   .rapidx/hooks/*.js                  — hook scripts (auto-fire on Claude/Cursor/Kiro)
 *   .rapidx/invariants/                 — catalog lives here (authored later)
 *   .rapidx/knowledge/                  — learned knowledge + graph artifacts
 *   .rapidx/inputs/                     — drop-zone for mandates/security artifacts
 *   scripts/build-knowledge-graph.js    — copied so `node scripts/...` works in-repo
 *
 * Claude Code, Cursor and Kiro additionally wire the hooks to fire automatically
 * (done in their own installers). Platforms without a native hook system
 * (Antigravity, Copilot, Codex, OpenCode, Gemini) still get the engine + commands;
 * enforcement there runs via `/rapidx:invariant-check` and the CI workflow, and
 * agents are instructed to run it during the execute phase.
 *
 * This step is idempotent and safe to run before any platform installer.
 */

const fs = require('fs');
const path = require('path');

const PKG_ROOT = path.join(__dirname, '..');
const TEMPLATES_DIR = path.join(PKG_ROOT, 'templates');

function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDirRecursive(s, d);
    else fs.copyFileSync(s, d);
  }
}

/**
 * Install the platform-neutral RapidX runtime.
 * @param {string} targetDir
 * @returns {{ engine: boolean, graph: boolean }}
 */
function installRapidxCore(targetDir) {
  const rapidxDir = path.join(targetDir, '.rapidx');
  const hooksDir = path.join(rapidxDir, 'hooks');
  const libDir = path.join(hooksDir, 'lib');

  // Directory skeleton
  for (const d of ['invariants', 'knowledge', 'inputs', 'hooks']) {
    fs.mkdirSync(path.join(rapidxDir, d), { recursive: true });
  }
  fs.mkdirSync(libDir, { recursive: true });

  const result = { engine: false, graph: false, scripts: false };

  // Hook scripts + lib/ (engine + graph-query) — recursive so lib/ is included
  const hooksSrc = path.join(TEMPLATES_DIR, 'hooks', 'rapidx');
  if (fs.existsSync(hooksSrc)) {
    copyDirRecursive(hooksSrc, hooksDir);
    result.engine = fs.existsSync(path.join(libDir, 'invariants.cjs'));
    result.graph = fs.existsSync(path.join(libDir, 'graph-query.cjs'));
  }

  // Knowledge-graph builder script (so `node scripts/build-knowledge-graph.js` works)
  const scriptSrc = path.join(PKG_ROOT, 'scripts', 'build-knowledge-graph.js');
  if (fs.existsSync(scriptSrc)) {
    const scriptsDest = path.join(targetDir, 'scripts');
    fs.mkdirSync(scriptsDest, { recursive: true });
    fs.copyFileSync(scriptSrc, path.join(scriptsDest, 'build-knowledge-graph.js'));
    const learnSrc = path.join(PKG_ROOT, 'scripts', 'learn-codebase.js');
    if (fs.existsSync(learnSrc)) fs.copyFileSync(learnSrc, path.join(scriptsDest, 'learn-codebase.js'));
    result.scripts = true;
  }

  // Seed an empty-but-valid catalog placeholder + README so the path is discoverable.
  const catalogPath = path.join(rapidxDir, 'invariants', 'catalog.json');
  if (!fs.existsSync(catalogPath)) {
    fs.writeFileSync(catalogPath, JSON.stringify({
      version: 1,
      generatedBy: 'rapidx-installer (placeholder)',
      updated: new Date().toISOString().split('T')[0],
      note: 'Empty placeholder. Author real invariants with /rapidx:invariant-catalog.',
      invariants: [],
    }, null, 2), 'utf8');
  }

  process.stdout.write(`  [RapidX] Core runtime installed → .rapidx/ (engine: ${result.engine ? 'yes' : 'no'}, graph: ${result.graph ? 'yes' : 'no'})\n`);
  return result;
}

module.exports = { installRapidxCore, copyDirRecursive };
