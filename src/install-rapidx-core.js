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
 *   .rapidx/migration/                  — gated workflow-modernization pipeline state (workflow-modernization profile only)
 *   .rapidx/loop/                       — autonomous /rapidx:loop pipeline state (workflow-modernization profile only)
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
const os = require('os');

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

const WORKFLOW_MODERNIZATION_PROFILES = new Set(['workflow-modernization']);

/**
 * Seed the `.rapidx/migration/` state directory used by the workflow
 * modernization pipeline (requirements intake / codebase comprehension →
 * reimagine → blueprint → forward-engineer). Only created for profiles that
 * opt into the workflow-modernization domain.
 */
function seedMigrationSkeleton(rapidxDir) {
  const migrationDir = path.join(rapidxDir, 'migration');
  for (const d of [
    'requirements', 'processes', 'blueprint', 'definitions', 'compliance',
    'parity-reports', 'forward-engineer',
  ]) {
    fs.mkdirSync(path.join(migrationDir, d), { recursive: true });
  }

  const manifestPath = path.join(migrationDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    fs.writeFileSync(manifestPath, JSON.stringify({
      version: 1,
      generatedBy: 'rapidx-installer (placeholder)',
      updated: new Date().toISOString().split('T')[0],
      source_platforms: [],
      intake_path: null,
      target_dir: null,
      processes: [],
    }, null, 2), 'utf8');
  }
}

/**
 * Seed the `.rapidx/loop/` state directory used by `/rapidx:loop` — the
 * autonomous intent→implementation→verification build pipeline. Separate
 * from `.rapidx/migration/` (the gated pipeline's state) so both can coexist
 * in the same engagement repo without clobbering each other.
 */
function seedLoopSkeleton(rapidxDir) {
  const loopDir = path.join(rapidxDir, 'loop');
  for (const d of ['execution', 'audit']) {
    fs.mkdirSync(path.join(loopDir, d), { recursive: true });
  }

  const manifestPath = path.join(loopDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    fs.writeFileSync(manifestPath, JSON.stringify({
      version: 1,
      generatedBy: 'rapidx-installer (placeholder)',
      updated: new Date().toISOString().split('T')[0],
      spec_frozen: false,
      current_phase: null,
      phases: [],
    }, null, 2), 'utf8');
  }

  // Append-only event stream the loop agents write to and the dashboard
  // server tails, so the live progress page has something to stream from
  // the moment /rapidx:loop starts.
  const progressPath = path.join(loopDir, 'progress.jsonl');
  if (!fs.existsSync(progressPath)) {
    fs.writeFileSync(progressPath, '', 'utf8');
  }

  // Zero-dependency local dashboard server + self-contained UI, launched
  // automatically by /rapidx:loop (see loop.md) via `node dashboard/launch.js`.
  const dashboardSrc = path.join(TEMPLATES_DIR, 'loop-dashboard');
  const dashboardDest = path.join(loopDir, 'dashboard');
  if (fs.existsSync(dashboardSrc) && !fs.existsSync(dashboardDest)) {
    copyDirRecursive(dashboardSrc, dashboardDest);
  }
}

/**
 * Seed the shared, home-dir-rooted RapidX Command install
 * (`~/.rapidx-command/`) — one collector for the whole machine, not one per
 * repo, so `/rapidx:command-center` run from any repo attaches to the same
 * fleet wall. Same home-dir-shared pattern already used for the GTD engine
 * install and the Understand-Anything plugin. Unconditional (every
 * profile) because the files are inert until a repo explicitly opts in via
 * `/rapidx:command-center`; idempotent so a reinstall never clobbers a
 * running instance's `data/` directory.
 */
function seedCommandCenterHome() {
  const commandCenterSrc = path.join(TEMPLATES_DIR, 'command-center');
  if (!fs.existsSync(commandCenterSrc)) return false;

  const home = path.join(os.homedir(), '.rapidx-command');
  fs.mkdirSync(home, { recursive: true });

  // Always refresh the code files so package updates (bugfixes, etc.) reach
  // an existing install. Safe: `data/` and `.state.json` (the collector's
  // runtime state) are never part of the template source tree, so they're
  // untouched by this loop regardless of whether they already exist.
  for (const entry of fs.readdirSync(commandCenterSrc, { withFileTypes: true })) {
    const dest = path.join(home, entry.name);
    const src = path.join(commandCenterSrc, entry.name);
    if (entry.isDirectory()) copyDirRecursive(src, dest);
    else fs.copyFileSync(src, dest);
  }

  fs.mkdirSync(path.join(home, 'data', 'control'), { recursive: true });
  return true;
}

/**
 * Install the platform-neutral RapidX runtime.
 * @param {string} targetDir
 * @param {{ profile?: { profile_id?: string } }} [opts]
 * @returns {{ engine: boolean, graph: boolean }}
 */
function installRapidxCore(targetDir, opts = {}) {
  const rapidxDir = path.join(targetDir, '.rapidx');
  const hooksDir = path.join(rapidxDir, 'hooks');
  const libDir = path.join(hooksDir, 'lib');

  // Directory skeleton
  for (const d of ['invariants', 'knowledge', 'inputs', 'hooks']) {
    fs.mkdirSync(path.join(rapidxDir, d), { recursive: true });
  }
  fs.mkdirSync(libDir, { recursive: true });

  const result = { engine: false, graph: false, scripts: false, migration: false, loop: false, commandCenter: false };

  // Hook scripts + lib/ (engine + graph-query) — recursive so lib/ is included
  const hooksSrc = path.join(TEMPLATES_DIR, 'hooks', 'rapidx');
  if (fs.existsSync(hooksSrc)) {
    copyDirRecursive(hooksSrc, hooksDir);
    result.engine = fs.existsSync(path.join(libDir, 'invariants.cjs'));
    result.graph = fs.existsSync(path.join(libDir, 'graph-query.cjs'));
  }

  // Shared multi-repo fleet console — home-dir install, every profile, but
  // inert until a repo opts in via /rapidx:command-center.
  result.commandCenter = seedCommandCenterHome();

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

  const profileId = opts.profile && opts.profile.profile_id;
  if (profileId && WORKFLOW_MODERNIZATION_PROFILES.has(profileId)) {
    seedMigrationSkeleton(rapidxDir);
    seedLoopSkeleton(rapidxDir);
    result.migration = true;
    result.loop = true;
  }

  process.stdout.write(`  [RapidX] Core runtime installed → .rapidx/ (engine: ${result.engine ? 'yes' : 'no'}, graph: ${result.graph ? 'yes' : 'no'})\n`);
  return result;
}

module.exports = { installRapidxCore, copyDirRecursive };
