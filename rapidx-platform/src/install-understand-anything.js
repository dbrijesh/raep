'use strict';

/**
 * install-understand-anything.js
 *
 * Installs the Understand-Anything plugin (https://github.com/Egonex-AI/Understand-Anything)
 * into each selected IDE platform. The plugin provides 8 AI-powered codebase
 * understanding commands under the /rapidx:understand-anything* namespace.
 *
 * Install strategy:
 *  1. Clone understand-anything-plugin/ from GitHub to ~/.understand-anything-plugin
 *  2. Build the core TypeScript package (pnpm install + build)
 *  3. For each IDE: copy skills, agents, and (for Claude) set CLAUDE_PLUGIN_ROOT in settings.json
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const UA_REPO = 'https://github.com/Egonex-AI/Understand-Anything.git';
const UA_PLUGIN_HOME = path.join(os.homedir(), '.understand-anything-plugin');

const UA_SKILL_NAMES = [
  'understand',
  'understand-chat',
  'understand-diff',
  'understand-explain',
  'understand-onboard',
  'understand-domain',
  'understand-dashboard',
  'understand-knowledge',
];

const UA_AGENT_NAMES = [
  'architecture-analyzer',
  'article-analyzer',
  'assemble-reviewer',
  'domain-analyzer',
  'file-analyzer',
  'graph-reviewer',
  'knowledge-graph-guide',
  'project-scanner',
  'tour-builder',
];

function copyTree(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyTree(s, d);
    else fs.copyFileSync(s, d);
  }
}

function run(cmd, opts = {}) {
  try {
    const result = spawnSync(cmd, {
      shell: true,
      timeout: opts.timeout || 120000,
      cwd: opts.cwd || process.cwd(),
      stdio: 'pipe',
    });
    return {
      ok: result.status === 0,
      stdout: (result.stdout || '').toString(),
      stderr: (result.stderr || '').toString(),
    };
  } catch (err) {
    return { ok: false, stdout: '', stderr: err.message };
  }
}

/**
 * Clone or update the understand-anything plugin to ~/.understand-anything-plugin.
 * Returns true on success, false if failed (non-fatal — warnings are printed).
 */
function ensurePluginInstalled() {
  const pluginPkg = path.join(UA_PLUGIN_HOME, 'package.json');

  if (fs.existsSync(pluginPkg)) {
    const updated = run('git pull --quiet', { cwd: UA_PLUGIN_HOME, timeout: 30000 });
    if (updated.ok) {
      process.stdout.write('  [RapidX] Understand-Anything plugin updated\n');
    } else {
      process.stdout.write('  [RapidX] Using existing Understand-Anything plugin\n');
    }
    return true;
  }

  process.stdout.write('  [RapidX] Cloning Understand-Anything plugin...\n');

  const tmpDir = path.join(os.tmpdir(), `ua-clone-${Date.now()}`);
  const cloned = run(`git clone --depth=1 --quiet "${UA_REPO}" "${tmpDir}"`, { timeout: 90000 });

  if (!cloned.ok) {
    process.stderr.write(
      `[RapidX] Warning: Could not clone Understand-Anything: ${cloned.stderr.trim()}\n` +
      `[RapidX] To install manually:\n` +
      `[RapidX]   git clone ${UA_REPO} /tmp/ua\n` +
      `[RapidX]   cp -r /tmp/ua/understand-anything-plugin ~/.understand-anything-plugin\n` +
      `[RapidX]   cd ~/.understand-anything-plugin && pnpm install && pnpm --filter @understand-anything/core build\n`
    );
    return false;
  }

  const pluginSrc = path.join(tmpDir, 'understand-anything-plugin');
  if (!fs.existsSync(pluginSrc)) {
    process.stderr.write('[RapidX] Warning: understand-anything-plugin/ not found in cloned repo\n');
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
    return false;
  }

  copyTree(pluginSrc, UA_PLUGIN_HOME);
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}

  process.stdout.write('  [RapidX] Understand-Anything plugin cloned → ~/.understand-anything-plugin\n');
  return true;
}

/**
 * Build the @understand-anything/core TypeScript package (idempotent).
 * Required for the .mjs scripts used by the understand skill.
 */
function buildPlugin() {
  if (!fs.existsSync(UA_PLUGIN_HOME)) return;

  const coreDist = path.join(UA_PLUGIN_HOME, 'packages', 'core', 'dist', 'index.js');
  if (fs.existsSync(coreDist)) return;

  process.stdout.write('  [RapidX] Building Understand-Anything core (this may take ~60 seconds)...\n');

  for (const pm of ['pnpm', 'npm']) {
    let installOk = run(`${pm} install --frozen-lockfile`, { cwd: UA_PLUGIN_HOME, timeout: 180000 }).ok;
    if (!installOk) {
      installOk = run(`${pm} install`, { cwd: UA_PLUGIN_HOME, timeout: 180000 }).ok;
    }
    if (!installOk) continue;

    const buildCmd = pm === 'pnpm'
      ? 'pnpm --filter @understand-anything/core build'
      : 'npm run build --workspace=packages/core';
    const build = run(buildCmd, { cwd: UA_PLUGIN_HOME, timeout: 180000 });

    if (build.ok) {
      process.stdout.write('  [RapidX] Understand-Anything core built successfully\n');
      return;
    }
  }

  process.stderr.write(
    '[RapidX] Warning: Could not build Understand-Anything core automatically.\n' +
    '[RapidX] Run manually: cd ~/.understand-anything-plugin && pnpm install && pnpm --filter @understand-anything/core build\n'
  );
}

/**
 * Copy UA skill directories (including .mjs/.py helper scripts) to a target skills dir.
 */
function installUASkillsTo(targetSkillsDir) {
  if (!fs.existsSync(UA_PLUGIN_HOME)) return 0;

  const pluginSkillsDir = path.join(UA_PLUGIN_HOME, 'skills');
  if (!fs.existsSync(pluginSkillsDir)) return 0;

  let count = 0;
  for (const skill of UA_SKILL_NAMES) {
    const src = path.join(pluginSkillsDir, skill);
    if (!fs.existsSync(src)) continue;
    copyTree(src, path.join(targetSkillsDir, skill));
    count++;
  }
  return count;
}

/**
 * Copy UA agent definitions to a target agents directory, prefixed with "ua-".
 */
function installUAAgentsTo(targetAgentsDir, { prefix = 'ua-' } = {}) {
  if (!fs.existsSync(UA_PLUGIN_HOME)) return 0;

  const agentsSrc = path.join(UA_PLUGIN_HOME, 'agents');
  if (!fs.existsSync(agentsSrc)) return 0;

  fs.mkdirSync(targetAgentsDir, { recursive: true });
  let count = 0;
  for (const file of fs.readdirSync(agentsSrc)) {
    if (!file.endsWith('.md')) continue;
    fs.copyFileSync(path.join(agentsSrc, file), path.join(targetAgentsDir, `${prefix}${file}`));
    count++;
  }
  return count;
}

/**
 * Merge CLAUDE_PLUGIN_ROOT into .claude/settings.json so skills can find the plugin at runtime.
 */
function mergePluginRootEnv(settingsPath) {
  let existing = {};
  try { existing = JSON.parse(fs.readFileSync(settingsPath, 'utf8')); } catch (_) {}

  const env = Object.assign({}, existing.env || {});
  if (!env.CLAUDE_PLUGIN_ROOT) {
    env.CLAUDE_PLUGIN_ROOT = UA_PLUGIN_HOME;
    fs.writeFileSync(settingsPath, JSON.stringify(Object.assign({}, existing, { env }), null, 2), 'utf8');
  }
}

// ── Per-platform install functions ─────────────────────────────────────────────

function installUAForClaude(targetDir) {
  const claudeDir = path.join(targetDir, '.claude');
  const skillCount = installUASkillsTo(path.join(claudeDir, 'skills'));
  const agentCount = installUAAgentsTo(path.join(claudeDir, 'agents'), { prefix: 'ua-' });
  if (skillCount > 0) process.stdout.write(`  [RapidX] Installed ${skillCount} Understand-Anything skills → .claude/skills/\n`);
  if (agentCount > 0) process.stdout.write(`  [RapidX] Installed ${agentCount} Understand-Anything agents → .claude/agents/\n`);
  mergePluginRootEnv(path.join(claudeDir, 'settings.json'));
}

function installUAForCursor(targetDir) {
  const cursorDir = path.join(targetDir, '.cursor');
  const skillCount = installUASkillsTo(path.join(cursorDir, 'skills'));
  const agentCount = installUAAgentsTo(path.join(cursorDir, 'agents'), { prefix: 'ua-' });
  if (skillCount > 0) process.stdout.write(`  [RapidX] Installed ${skillCount} Understand-Anything skills → .cursor/skills/\n`);
  if (agentCount > 0) process.stdout.write(`  [RapidX] Installed ${agentCount} Understand-Anything agents → .cursor/agents/\n`);
}

function installUAForVSCode(targetDir) {
  const skillCount = installUASkillsTo(path.join(targetDir, '.github', 'copilot', 'skills'));
  if (skillCount > 0) process.stdout.write(`  [RapidX] Installed ${skillCount} Understand-Anything skills → .github/copilot/skills/\n`);

  const instructionsPath = path.join(targetDir, '.github', 'copilot-instructions.md');
  if (fs.existsSync(instructionsPath)) {
    const existing = fs.readFileSync(instructionsPath, 'utf8');
    if (!existing.includes('understand-anything')) {
      fs.appendFileSync(instructionsPath,
        '\n\n## Understand-Anything — Codebase Knowledge Graph\n\n' +
        'Use these commands to explore and understand this codebase:\n\n' +
        '- `/rapidx:understand-anything` — Build interactive knowledge graph\n' +
        '- `/rapidx:understand-anything-chat [query]` — Ask questions about the codebase\n' +
        '- `/rapidx:understand-anything-diff` — Analyze impact of current changes\n' +
        '- `/rapidx:understand-anything-explain [file]` — Deep-dive into a component\n' +
        '- `/rapidx:understand-anything-onboard` — Generate onboarding guide\n' +
        '- `/rapidx:understand-anything-domain` — Extract business domain knowledge\n' +
        '- `/rapidx:understand-anything-dashboard` — Launch visual knowledge graph\n' +
        '- `/rapidx:understand-anything-knowledge [dir]` — Analyze LLM wiki knowledge base\n\n' +
        'Skill files are in `.github/copilot/skills/understand*/SKILL.md`.\n' +
        'Powered by [Understand-Anything](https://github.com/Egonex-AI/Understand-Anything) (MIT).\n',
        'utf8'
      );
    }
  }
}

function installUAForKiro(targetDir) {
  const skillCount = installUASkillsTo(path.join(targetDir, '.kiro', 'skills'));
  const agentCount = installUAAgentsTo(path.join(targetDir, '.kiro', 'agents'), { prefix: 'ua-' });
  if (skillCount > 0) process.stdout.write(`  [RapidX] Installed ${skillCount} Understand-Anything skills → .kiro/skills/\n`);
  if (agentCount > 0) process.stdout.write(`  [RapidX] Installed ${agentCount} Understand-Anything agents → .kiro/agents/\n`);
}

function installUAForCodex(targetDir) {
  const skillCount = installUASkillsTo(path.join(targetDir, '.agents', 'skills'));
  const agentCount = installUAAgentsTo(path.join(targetDir, '.agents', 'agents'), { prefix: 'ua-' });
  if (skillCount > 0) process.stdout.write(`  [RapidX] Installed ${skillCount} Understand-Anything skills → .agents/skills/\n`);
  if (agentCount > 0) process.stdout.write(`  [RapidX] Installed ${agentCount} Understand-Anything agents → .agents/agents/\n`);
}

function installUAForOpenCode(targetDir) {
  const skillCount = installUASkillsTo(path.join(targetDir, '.opencode', 'skills'));
  if (skillCount > 0) process.stdout.write(`  [RapidX] Installed ${skillCount} Understand-Anything skills → .opencode/skills/\n`);
}

function installUAForCopilotCLI(targetDir) {
  const skillCount = installUASkillsTo(path.join(targetDir, '.github', 'copilot', 'skills'));
  if (skillCount > 0) process.stdout.write(`  [RapidX] Installed ${skillCount} Understand-Anything skills → .github/copilot/skills/\n`);
}

function installUAForGemini(targetDir) {
  const skillCount = installUASkillsTo(path.join(targetDir, '.gemini', 'skills'));
  if (skillCount > 0) process.stdout.write(`  [RapidX] Installed ${skillCount} Understand-Anything skills → .gemini/skills/\n`);
}

function installUAForAntigravity(targetDir) {
  const skillCount = installUASkillsTo(path.join(targetDir, '.agent', 'skills'));
  if (skillCount > 0) process.stdout.write(`  [RapidX] Installed ${skillCount} Understand-Anything skills → .agent/skills/\n`);
}

/**
 * Main entry: ensure plugin installed and built, then install for the given platform.
 *
 * @param {string} platform - 'claude'|'cursor'|'vscode'|'kiro'|'codex'|'opencode'|'copilot-cli'|'gemini'|'antigravity'
 * @param {string} targetDir - project root directory
 */
function installUnderstandAnything(platform, targetDir) {
  const installed = ensurePluginInstalled();
  if (!installed) return;

  buildPlugin();

  switch (platform) {
    case 'claude':       installUAForClaude(targetDir);       break;
    case 'cursor':       installUAForCursor(targetDir);       break;
    case 'vscode':       installUAForVSCode(targetDir);       break;
    case 'kiro':         installUAForKiro(targetDir);         break;
    case 'codex':        installUAForCodex(targetDir);        break;
    case 'opencode':     installUAForOpenCode(targetDir);     break;
    case 'copilot-cli':  installUAForCopilotCLI(targetDir);  break;
    case 'gemini':       installUAForGemini(targetDir);       break;
    case 'antigravity':  installUAForAntigravity(targetDir);  break;
    default:
      process.stderr.write(`[RapidX] Unknown platform for Understand-Anything: ${platform}\n`);
  }
}

module.exports = {
  installUnderstandAnything,
  ensurePluginInstalled,
  buildPlugin,
  UA_SKILL_NAMES,
  UA_AGENT_NAMES,
  UA_PLUGIN_HOME,
};
