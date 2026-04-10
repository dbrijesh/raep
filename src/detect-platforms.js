'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Run a command and return trimmed stdout, or null on failure.
 * @param {string} cmd
 * @returns {string|null}
 */
function run(cmd) {
  try {
    return execSync(cmd, { stdio: ['pipe', 'pipe', 'pipe'], timeout: 8000 })
      .toString()
      .trim();
  } catch (_) {
    return null;
  }
}

/**
 * Extract a version string (semver-ish) from a command output line.
 * @param {string|null} output
 * @returns {string|null}
 */
function extractVersion(output) {
  if (!output) return null;
  const m = output.match(/(\d+\.\d+(?:\.\d+)?(?:[-+][^\s]*)?)/);
  return m ? m[1] : null;
}

/**
 * Check whether a filesystem path exists.
 * @param {string} p
 * @returns {boolean}
 */
function pathExists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Detect Claude Code CLI.
 */
function detectClaude() {
  const out = run('claude --version');
  if (!out) return { detected: false, version: null };
  return { detected: true, version: extractVersion(out) };
}

/**
 * Detect Codex CLI.
 */
function detectCodex() {
  const out = run('codex --version');
  if (!out) return { detected: false, version: null };
  return { detected: true, version: extractVersion(out) };
}

/**
 * Detect OpenCode.
 */
function detectOpencode() {
  const out = run('opencode --version');
  if (!out) return { detected: false, version: null };
  return { detected: true, version: extractVersion(out) };
}

/**
 * Detect Gemini CLI.
 */
function detectGemini() {
  const out = run('gemini --version');
  if (!out) return { detected: false, version: null };
  return { detected: true, version: extractVersion(out) };
}

/**
 * Detect GitHub Copilot CLI (standalone gh extension).
 */
function detectCopilotCli() {
  // Try gh copilot --version first
  const direct = run('gh copilot --version');
  if (direct) {
    return { detected: true, version: extractVersion(direct) };
  }
  // Fall back to gh extension list
  const extList = run('gh extension list');
  if (extList && extList.toLowerCase().includes('copilot')) {
    return { detected: true, version: null };
  }
  return { detected: false, version: null };
}

/**
 * Detect VS Code and its Copilot extensions.
 */
function detectVSCode() {
  const out = run('code --version');
  if (!out) return { detected: false, version: null, copilot: false, copilotChat: false };

  const version = extractVersion(out);
  let copilot = false;
  let copilotChat = false;

  const extensions = run('code --list-extensions');
  if (extensions) {
    const list = extensions.toLowerCase();
    copilot = list.includes('github.copilot');
    copilotChat = list.includes('github.copilot-chat');
  }

  return { detected: true, version, copilot, copilotChat };
}

/**
 * Detect Cursor IDE.
 */
function detectCursor() {
  // Check known install paths
  const candidates = [
    '/Applications/Cursor.app',
    path.join(os.homedir(), '.local', 'share', 'cursor'),
    path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Cursor'),
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Programs', 'Cursor') : null,
    '.cursor',
  ].filter(Boolean);

  for (const p of candidates) {
    if (pathExists(p)) {
      // Attempt to read version from known locations
      const versionPaths = [
        path.join(p, 'resources', 'app', 'package.json'),
        path.join(p, 'Contents', 'Resources', 'app', 'package.json'),
      ];
      for (const vp of versionPaths) {
        try {
          const pkg = JSON.parse(fs.readFileSync(vp, 'utf8'));
          return { detected: true, version: pkg.version || null };
        } catch (_) {
          // continue
        }
      }
      return { detected: true, version: null };
    }
  }

  // Try cursor --version as fallback
  const out = run('cursor --version');
  if (out) return { detected: true, version: extractVersion(out) };

  return { detected: false, version: null };
}

/**
 * Detect JetBrains IDEs.
 */
function detectJetBrains() {
  // Check for .idea/ directory in CWD
  if (pathExists('.idea')) {
    return { detected: true, version: null };
  }

  // Check common JetBrains install paths
  const home = os.homedir();
  const candidates = [
    path.join(home, '.local', 'share', 'JetBrains'),
    path.join(home, 'Library', 'Application Support', 'JetBrains'),
    path.join(home, 'AppData', 'Roaming', 'JetBrains'),
    process.env.APPDATA ? path.join(process.env.APPDATA, 'JetBrains') : null,
    '/Applications/IntelliJ IDEA.app',
    '/Applications/WebStorm.app',
    '/Applications/PyCharm.app',
    '/Applications/GoLand.app',
  ].filter(Boolean);

  for (const p of candidates) {
    if (pathExists(p)) {
      return { detected: true, version: null };
    }
  }

  return { detected: false, version: null };
}

/**
 * Detect Antigravity.
 */
function detectAntigravity() {
  if (pathExists('.agent')) {
    return { detected: true, version: null };
  }
  const out = run('antigravity --version');
  if (out) return { detected: true, version: extractVersion(out) };
  return { detected: false, version: null };
}

/**
 * Detect all development platforms and IDEs.
 * @returns {object} Detection results keyed by platform name.
 */
function detectPlatforms() {
  return {
    claude: detectClaude(),
    codex: detectCodex(),
    opencode: detectOpencode(),
    gemini: detectGemini(),
    copilotCli: detectCopilotCli(),
    vscode: detectVSCode(),
    cursor: detectCursor(),
    jetbrains: detectJetBrains(),
    antigravity: detectAntigravity(),
  };
}

module.exports = { detectPlatforms };
