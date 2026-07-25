'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Remove a directory if it exists.
 */
function removeDir(p) {
  try {
    fs.rmSync(p, { recursive: true, force: true });
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Remove a file if it exists.
 */
function removeFile(p) {
  try {
    fs.unlinkSync(p);
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Clean RapidX keys from a settings.json file.
 * @param {string} settingsPath
 */
function cleanSettings(settingsPath) {
  try {
    const text = fs.readFileSync(settingsPath, 'utf8');
    const settings = JSON.parse(text);

    // Remove RapidX-specific keys
    const rapidxKeys = ['rapidx', 'rapidx.profile', 'rapidx.techStack', 'rapidx.enabled'];
    for (const key of rapidxKeys) {
      delete settings[key];
    }

    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
  } catch (e) {
    if (e.code !== 'ENOENT') {
      // File exists but is malformed JSON — warn and leave it untouched
      process.stderr.write(`[RapidX] Could not clean ${settingsPath}: ${e.message}\n`);
      process.stderr.write(`[RapidX] File may contain malformed JSON — remove RapidX keys manually.\n`);
    }
    // ENOENT = file doesn't exist, nothing to clean, silently skip
  }
}

/**
 * Perform a clean uninstall of RapidX from a target directory.
 * @param {object} options
 * @param {string} options.targetDir
 * @param {string[]} options.platforms
 */
function uninstall(options) {
  const { targetDir, platforms = [] } = options;
  const removed = [];

  // Always remove .rapidx/ runtime state
  if (removeDir(path.join(targetDir, '.rapidx'))) removed.push('.rapidx/');

  // Platform-specific cleanup
  if (platforms.includes('claude')) {
    removeDir(path.join(targetDir, '.claude', 'commands', 'gsd')); // clean up legacy dir if present
    removeDir(path.join(targetDir, '.claude', 'commands', 'rapidx'));
    cleanSettings(path.join(targetDir, '.claude', 'settings.json'));
    removeFile(path.join(targetDir, 'CLAUDE.md'));
    // Remove RapidX engine from home directory (shared across all projects)
    const gtdHome = path.join(os.homedir(), '.claude', 'get-things-done');
    removeDir(gtdHome);
    removed.push('.claude/commands/rapidx/', 'CLAUDE.md', '~/.claude/get-things-done/');
  }

  if (platforms.includes('vscode')) {
    removeFile(path.join(targetDir, '.github', 'copilot-instructions.md'));
    cleanSettings(path.join(targetDir, '.vscode', 'settings.json'));
    removeFile(path.join(targetDir, 'AGENTS.md'));
    removed.push('.github/copilot-instructions.md', '.vscode/settings.json (cleaned)', 'AGENTS.md');
  }

  if (platforms.includes('cursor')) {
    removeDir(path.join(targetDir, '.cursor', 'rules'));
    removeDir(path.join(targetDir, '.cursor', 'hooks'));
    removeDir(path.join(targetDir, '.cursor', 'skills'));
    removeDir(path.join(targetDir, '.cursor', 'agents'));
    removeDir(path.join(targetDir, '.cursor', 'commands', 'rapidx'));
    removeFile(path.join(targetDir, '.cursor', 'mcp.json'));
    removed.push('.cursor/rules/', '.cursor/hooks/', '.cursor/skills/', '.cursor/agents/', '.cursor/commands/rapidx/', '.cursor/mcp.json');
  }

  if (platforms.includes('codex')) {
    removeDir(path.join(targetDir, '.codex'));
    removeDir(path.join(targetDir, '.agents', 'skills'));
    removed.push('.codex/', '.agents/skills/');
  }

  if (platforms.includes('opencode')) {
    removeDir(path.join(targetDir, '.opencode'));
    removed.push('.opencode/');
  }

  if (platforms.includes('gemini')) {
    removeDir(path.join(targetDir, '.gemini'));
    removed.push('.gemini/');
  }

  if (platforms.includes('antigravity')) {
    removeFile(path.join(targetDir, '.agent', 'config.json'));
    removed.push('.agent/config.json');
  }

  if (platforms.includes('kiro')) {
    removeDir(path.join(targetDir, '.kiro', 'skills'));
    removeDir(path.join(targetDir, '.kiro', 'powers'));
    removeDir(path.join(targetDir, '.kiro', 'steering'));
    removeDir(path.join(targetDir, '.kiro', 'hooks'));
    // Only remove .kiro/ itself if it is now empty
    try {
      const remaining = fs.readdirSync(path.join(targetDir, '.kiro'));
      if (remaining.length === 0) removeDir(path.join(targetDir, '.kiro'));
    } catch (_) { /* already gone */ }
    removed.push('.kiro/skills/', '.kiro/powers/', '.kiro/steering/', '.kiro/hooks/');
  }

  process.stdout.write('\n  Removed:\n');
  removed.forEach(p => process.stdout.write(`  - ${p}\n`));

  return { success: true, removed };
}

module.exports = { uninstall };
