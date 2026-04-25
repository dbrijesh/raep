'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Post-install verification.
 * Checks that required files exist and configurations are in place.
 *
 * @param {object} options
 * @param {string} options.targetDir - Installation root directory
 * @param {string[]} options.platforms - List of installed platforms
 * @param {boolean} [options.skipVerify] - Skip verification entirely
 * @returns {{ success: boolean, errors: string[], warnings: string[] }}
 */
function verifyInstall(options) {
  if (options.skipVerify) {
    return { success: true, errors: [], warnings: ['Verification skipped (--skip-verify)'] };
  }

  const { targetDir, platforms = [] } = options;
  const errors = [];
  const warnings = [];

  function checkFile(relPath, label) {
    const full = path.join(targetDir, relPath);
    if (!fs.existsSync(full)) {
      errors.push(`Missing ${label}: ${relPath}`);
      return false;
    }
    return true;
  }

  function checkDir(relPath, label) {
    const full = path.join(targetDir, relPath);
    try {
      const stat = fs.statSync(full);
      if (!stat.isDirectory()) {
        errors.push(`Expected directory but found file: ${relPath}`);
        return false;
      }
      const entries = fs.readdirSync(full);
      if (entries.length === 0) {
        warnings.push(`Empty directory: ${relPath} (${label})`);
      }
      return true;
    } catch (_) {
      errors.push(`Missing directory ${label}: ${relPath}`);
      return false;
    }
  }

  // Always check .rapidx/stack.json
  checkFile('.rapidx/stack.json', 'stack config');

  // Check GTD engine (always at ~/.claude/get-things-done/ regardless of scope)
  if (platforms.includes('claude')) {
    const gtdHome = path.join(os.homedir(), '.claude', 'get-things-done');
    const checkGtdDir = (sub, label) => {
      const full = path.join(gtdHome, sub);
      if (!fs.existsSync(full)) {
        errors.push(`Missing GTD engine ${label}: ~/.claude/get-things-done/${sub}`);
      }
    };
    checkGtdDir('workflows', 'workflows');
    checkGtdDir('references', 'references');
    checkGtdDir('contexts', 'contexts');
    checkGtdDir('agents', 'agents');
    checkGtdDir('templates', 'templates');
    checkGtdDir('bin/rapidx-tools.cjs', 'rapidx-tools binary');
  }

  // Check per-platform files
  if (platforms.includes('claude')) {
    checkFile('CLAUDE.md', 'CLAUDE.md');
    checkDir('.claude/commands/rapidx', 'RapidX commands (/rapidx: namespace)');
    checkFile('.claude/settings.json', 'Claude settings');
  }

  if (platforms.includes('vscode')) {
    checkFile('.github/copilot-instructions.md', 'Copilot instructions');
    checkFile('AGENTS.md', 'AGENTS.md');
    // Settings.json might not exist if VS Code wasn't configured yet
    if (!fs.existsSync(path.join(targetDir, '.vscode', 'settings.json'))) {
      warnings.push('Missing .vscode/settings.json — will be created on first VS Code open');
    }
  }

  if (platforms.includes('cursor')) {
    checkDir('.cursor/rules', 'Cursor rules');
    checkFile('AGENTS.md', 'AGENTS.md');
  }

  if (platforms.includes('codex')) {
    checkFile('.codex/config.toml', 'Codex config');
    checkFile('.codex/AGENTS.md', 'Codex AGENTS.md');
  }

  if (platforms.includes('opencode')) {
    checkFile('.opencode/opencode.json', 'OpenCode config');
    checkFile('AGENTS.md', 'AGENTS.md');
  }

  if (platforms.includes('gemini')) {
    checkFile('.gemini/config.json', 'Gemini config');
    checkFile('.gemini/AGENTS.md', 'Gemini AGENTS.md');
    checkFile('AGENTS.md', 'AGENTS.md');
  }

  if (platforms.includes('antigravity')) {
    checkFile('.agent/config.json', 'Antigravity config');
    checkFile('.agent/AGENTS.md', 'Antigravity AGENTS.md');
    checkDir('.agent/skills', 'Antigravity skills');
    checkFile('AGENTS.md', 'AGENTS.md');
  }

  if (platforms.includes('copilot-cli')) {
    checkFile('.github/copilot/instructions.md', 'Copilot CLI instructions');
    checkFile('AGENTS.md', 'AGENTS.md');
  }

  if (platforms.includes('kiro')) {
    checkDir('.kiro/skills', 'Kiro skills');
    checkDir('.kiro/powers', 'Kiro powers');
    checkDir('.kiro/steering', 'Kiro steering');
    checkDir('.kiro/hooks', 'Kiro hooks');
    checkFile('.kiro/steering/tech-stack.md', 'Kiro tech-stack steering');
    checkFile('.kiro/steering/coding-standards.md', 'Kiro coding-standards steering');
    checkFile('AGENTS.md', 'AGENTS.md');
  }

  return {
    success: errors.length === 0,
    errors,
    warnings,
  };
}

module.exports = { verifyInstall };
