'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { writeClaudeMd } = require('./generate-claude-md');
const { generateAllCommands } = require('./generate-commands');
const { writeCommandsIndex } = require('./generate-commands-index');

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');
const GTD_DIR = path.join(__dirname, '..', 'get-things-done');

// GTD engine always lives at ~/.claude/get-things-done/ regardless of install scope,
// because all @~/.claude/get-things-done/ references in commands and workflows
// resolve against the user's home directory, not the project directory.
const GTD_INSTALL_DIR = path.join(os.homedir(), '.claude', 'get-things-done');

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

// Text file extensions whose content should have /gsd: rewritten to /rapidx:
const TEXT_EXTS = new Set(['.md', '.txt', '.json', '.toml', '.yaml', '.yml']);

/**
 * Copy the GTD engine directory to dest, rewriting /gsd: → /rapidx: in text files.
 * Binary files (.cjs, .js, etc.) are copied as-is.
 */
function copyGtdEngine(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyGtdEngine(srcPath, destPath);
    } else if (TEXT_EXTS.has(path.extname(entry.name).toLowerCase())) {
      const content = fs.readFileSync(srcPath, 'utf8');
      fs.writeFileSync(destPath, content.replace(/\/gsd:/g, '/rapidx:'), 'utf8');
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

  // Map hook name → Claude Code event type (settings.json uses PascalCase event keys)
  // Trigger names in hooks.json use snake_case; Claude settings.json uses PascalCase.
  const TRIGGER_MAP = {
    'session-start':    { event: 'UserPromptSubmit', matcher: null },
    'session-end':      { event: 'Stop',             matcher: null },
    'audit-trail':      { event: 'PostToolUse',      matcher: '.*' },
    'secret-scanner':   { event: 'PreToolUse',       matcher: 'Write|Edit|MultiEdit' },
    'suggest-compact':  { event: 'PostToolUse',      matcher: '.*' },
    'governance-gate':  { event: 'PreToolUse',       matcher: 'Bash' },
    'codebase-context': { event: 'UserPromptSubmit', matcher: null },
    'knowledge-sync':   { event: 'Stop',             matcher: null },
    'spec-validator':   { event: 'PreToolUse',       matcher: 'Bash' },
  };

  // Build Claude settings hooks object: { EventType: [ hookEntry, ... ] }
  const hooksObj = {};
  for (const h of hooks) {
    const mapping = TRIGGER_MAP[h];
    if (!mapping) continue;
    const { event, matcher } = mapping;
    if (!hooksObj[event]) hooksObj[event] = [];
    const entry = {
      hooks: [{ type: 'command', command: `node .rapidx/hooks/${h}.js` }],
    };
    if (matcher) entry.matcher = matcher;
    hooksObj[event].push(entry);
  }

  const rapidxSettings = {
    hooks: hooksObj,
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

  // ── Install GTD engine to ~/.claude/get-things-done/ ─────────────────────
  // GTD commands reference @~/.claude/get-things-done/workflows|references|etc.
  // These paths always resolve against the user's home directory, so the engine
  // must live there regardless of whether this is a local or global install.
  if (fs.existsSync(GTD_DIR)) {
    copyGtdEngine(GTD_DIR, GTD_INSTALL_DIR);
    process.stdout.write(`  [RapidX] Installed Get Things Done engine → ${GTD_INSTALL_DIR}\n`);
  } else {
    process.stderr.write(`[RapidX] Warning: GTD engine source not found at ${GTD_DIR}\n`);
  }

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
