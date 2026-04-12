'use strict';

const fs = require('fs');
const path = require('path');
const { writeClaudeMd } = require('./generate-claude-md');
const { generateAllCommands } = require('./generate-commands');
const { writeCommandsIndex } = require('./generate-commands-index');

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');
const GTD_DIR = path.join(__dirname, '..', 'get-things-done');

/**
 * Copy a directory recursively.
 */
function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Merge RapidX hook config into an existing .claude/settings.json.
 * Creates the file if it doesn't exist.
 * @param {string} settingsPath
 * @param {object} components
 */
function mergeClaudeSettings(settingsPath, components) {
  let existing = {};
  try {
    existing = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  } catch (_) {
    // File doesn't exist or is invalid — start fresh
  }

  const hooks = components ? Array.from(components.hooks) : ['session-start', 'session-end', 'audit-trail', 'secret-scanner'];

  // Build hooks array for Claude settings
  const hookConfigs = hooks.map(h => ({
    name: h,
    script: `.rapidx/hooks/${h}.js`,
  }));

  const rapidxSettings = {
    hooks: hookConfigs,
    permissions: {
      allow: [
        'Bash(node:.rapidx/hooks/*.js)',
        'Read(.rapidx/**)',
        'Write(.rapidx/**)',
      ],
    },
  };

  // Merge: preserve all existing keys, add/update rapidx namespace
  const merged = Object.assign({}, existing, {
    rapidx: Object.assign({}, existing.rapidx || {}, rapidxSettings),
  });

  fs.writeFileSync(settingsPath, JSON.stringify(merged, null, 2), 'utf8');
}

/**
 * Install RapidX for Claude Code.
 * @param {object} options
 * @param {string} options.targetDir
 * @param {object} options.profile
 * @param {object} options.stack
 * @param {object} options.components - { rules: Set, skills: Set, agents: Set, hooks: Set }
 */
function installClaude(options) {
  const { targetDir, profile, stack, components } = options;

  // ── Directory structure ────────────────────────────────────────────────────
  const claudeDir = path.join(targetDir, '.claude');
  const rapidxCommandsDir = path.join(claudeDir, 'commands', 'rapidx');
  const hooksDir = path.join(targetDir, '.rapidx', 'hooks');

  fs.mkdirSync(rapidxCommandsDir, { recursive: true });
  fs.mkdirSync(hooksDir, { recursive: true });

  // ── Convert GTD commands → /rapidx:* and write to .claude/commands/rapidx/ ─
  // Source files stay in get-things-done/commands/gsd/ (vendor copy).
  // generateAllCommands rewrites all internal /gsd: refs to /rapidx: on output.
  const gtdSrc = path.join(GTD_DIR, 'commands', 'gsd');
  const gtdResult = generateAllCommands(gtdSrc, {
    rapidx: rapidxCommandsDir,
  });
  if (gtdResult.generated > 0) {
    process.stdout.write(`  [RapidX] Installed ${gtdResult.generated} Get Things Done commands as /rapidx:*\n`);
  }

  // ── Copy hand-authored RapidX commands ────────────────────────────────────
  const rapidxSrc = path.join(TEMPLATES_DIR, 'commands', 'rapidx');
  if (fs.existsSync(rapidxSrc)) {
    copyDirRecursive(rapidxSrc, rapidxCommandsDir);
  }

  // ── Write COMMANDS.md index ────────────────────────────────────────────────
  writeCommandsIndex(rapidxCommandsDir, { projectRoot: targetDir });

  // ── Copy hook scripts ──────────────────────────────────────────────────────
  const hooksSrc = path.join(TEMPLATES_DIR, 'hooks', 'rapidx');
  if (fs.existsSync(hooksSrc)) {
    copyDirRecursive(hooksSrc, hooksDir);
  }

  // ── Merge settings.json ────────────────────────────────────────────────────
  const settingsPath = path.join(claudeDir, 'settings.json');
  mergeClaudeSettings(settingsPath, components);

  // ── Generate CLAUDE.md ─────────────────────────────────────────────────────
  writeClaudeMd(targetDir, profile, stack, components);

  return { success: true };
}

module.exports = { installClaude };
