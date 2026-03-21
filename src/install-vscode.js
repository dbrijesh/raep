'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { writeCopilotInstructions } = require('./generate-copilot-instructions');
const { writeAgentsMd } = require('./generate-agents-md');

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');
const COPILOT_EXTENSION_URL = 'https://marketplace.visualstudio.com/items?itemName=GitHub.copilot';

/**
 * Check whether GitHub Copilot extensions are installed in VS Code.
 * @returns {{ copilot: boolean, copilotChat: boolean }}
 */
function checkCopilotExtensions() {
  try {
    const out = execSync('code --list-extensions', { stdio: ['pipe', 'pipe', 'pipe'], timeout: 8000 }).toString().toLowerCase();
    return {
      copilot: out.includes('github.copilot'),
      copilotChat: out.includes('github.copilot-chat'),
    };
  } catch (_) {
    return { copilot: false, copilotChat: false };
  }
}

/**
 * Merge VS Code settings.json — read existing, add RapidX keys, write back.
 * Never overwrites non-RapidX keys.
 * @param {string} settingsPath
 * @param {object} stack
 */
function mergeVSCodeSettings(settingsPath, stack) {
  let existing = {};
  try {
    const text = fs.readFileSync(settingsPath, 'utf8');
    existing = JSON.parse(text);
  } catch (_) {
    // File doesn't exist — start fresh
  }

  const fe = stack.frontend || {};
  const be = stack.backend || {};

  const rapidxSettings = {
    'rapidx.profile': stack.profile || 'default',
    'rapidx.techStack': {
      frontend: fe.framework || null,
      backend: be.language || null,
      database: (stack.database && stack.database.primary) || null,
    },
    'rapidx.enabled': true,
    'github.copilot.enable': { '*': true },
    'github.copilot.chat.enabled': true,
  };

  // Merge
  const merged = Object.assign({}, existing, rapidxSettings);
  // Preserve any existing rapidx keys that we don't explicitly set
  if (existing.rapidx) {
    merged.rapidx = Object.assign({}, existing.rapidx, rapidxSettings.rapidx || {});
  }

  const dir = path.dirname(settingsPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(settingsPath, JSON.stringify(merged, null, 2), 'utf8');
}

/**
 * Generate VS Code extensions.json with Copilot recommendations.
 * @param {string} vscodeDir
 */
function writeExtensionsJson(vscodeDir) {
  const extensionsPath = path.join(vscodeDir, 'extensions.json');
  let existing = { recommendations: [] };
  try {
    existing = JSON.parse(fs.readFileSync(extensionsPath, 'utf8'));
  } catch (_) {}

  const recommended = ['github.copilot', 'github.copilot-chat'];
  const current = existing.recommendations || [];
  // Merge without duplicates
  for (const ext of recommended) {
    if (!current.includes(ext)) current.push(ext);
  }
  existing.recommendations = current;

  fs.writeFileSync(extensionsPath, JSON.stringify(existing, null, 2), 'utf8');
}

/**
 * Create skill reference files under .github/copilot/skills/.
 * @param {string} copilotDir
 * @param {object} components
 */
function createSkillRefs(copilotDir, components) {
  const skillsDir = path.join(copilotDir, 'skills');
  fs.mkdirSync(skillsDir, { recursive: true });

  const skills = components ? Array.from(components.skills) : [];
  for (const skill of skills) {
    const skillTemplateSrc = path.join(TEMPLATES_DIR, 'skills', skill, 'SKILL.md');
    const destPath = path.join(skillsDir, `${skill}.md`);

    if (fs.existsSync(skillTemplateSrc)) {
      fs.copyFileSync(skillTemplateSrc, destPath);
    } else {
      // Write stub
      fs.writeFileSync(destPath, `# Skill: ${skill}\n\nSee the full skill definition in \`templates/skills/${skill}/\`.\n`, 'utf8');
    }
  }
}

/**
 * Install RapidX for VS Code + GitHub Copilot.
 * @param {object} options
 * @param {string} options.targetDir
 * @param {object} options.profile
 * @param {object} options.stack
 * @param {object} options.components
 * @param {boolean} [options.checkExtensions=true]
 */
function installVSCode(options) {
  const { targetDir, profile, stack, components, checkExtensions = true } = options;

  const vscodeDir = path.join(targetDir, '.vscode');
  const githubDir = path.join(targetDir, '.github');
  const copilotDir = path.join(githubDir, 'copilot');

  fs.mkdirSync(vscodeDir, { recursive: true });
  fs.mkdirSync(githubDir, { recursive: true });
  fs.mkdirSync(copilotDir, { recursive: true });

  // ── Check Copilot extensions ────────────────────────────────────────────────
  if (checkExtensions) {
    const ext = checkCopilotExtensions();
    if (!ext.copilot) {
      process.stdout.write(`\n  [RapidX] GitHub Copilot extension not detected.\n`);
      process.stdout.write(`  Install it from: ${COPILOT_EXTENSION_URL}\n\n`);
    }
  }

  // ── Generate .github/copilot-instructions.md ───────────────────────────────
  writeCopilotInstructions(targetDir, profile, stack, components);

  // ── Merge .vscode/settings.json ────────────────────────────────────────────
  mergeVSCodeSettings(path.join(vscodeDir, 'settings.json'), stack);

  // ── Generate .vscode/extensions.json ──────────────────────────────────────
  writeExtensionsJson(vscodeDir);

  // ── Generate AGENTS.md ─────────────────────────────────────────────────────
  writeAgentsMd(targetDir, profile, stack, components);

  // ── Create skill reference files in .github/copilot/skills/ ───────────────
  createSkillRefs(copilotDir, components);

  return { success: true };
}

module.exports = { installVSCode, checkCopilotExtensions, mergeVSCodeSettings };
