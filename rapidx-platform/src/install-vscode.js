'use strict';

const fs = require('fs');
const path = require('path');
const { generateAllCommands } = require('./generate-commands');
const { writeCommandsIndex } = require('./generate-commands-index');
const { injectAgentSkills } = require('./inject-agent-skills');
const { execSync } = require('child_process');
const { writeCopilotInstructions } = require('./generate-copilot-instructions');
const { writeAgentsMd } = require('./generate-agents-md');
const { AGENT_NAMES } = require('./constants');

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');
const GTD_DIR = path.join(__dirname, '..', 'get-things-done');
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
    // Point Copilot at the project instructions file
    'github.copilot.chat.codeGeneration.instructions': [
      { file: '.github/copilot-instructions.md' },
    ],
    // VS Code discovers .github/prompts/ automatically; list it explicitly for clarity
    'chat.promptFilesLocations': {
      '.github/prompts': true,
    },
  };

  // Merge: RapidX defaults go in first so existing user settings always win.
  // The rapidx.* namespace is ours — our values take priority over stale existing keys.
  const merged = Object.assign({}, rapidxSettings, existing);
  merged['rapidx.profile'] = rapidxSettings['rapidx.profile'];
  merged['rapidx.techStack'] = rapidxSettings['rapidx.techStack'];
  merged['rapidx.enabled'] = true;

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
 * Create skill reference files under .github/skills/.
 * @param {string} githubDir
 * @param {object} components
 */
function createSkillRefs(githubDir, components) {
  const skillsDir = path.join(githubDir, 'skills');
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

// Shared agent list — see src/constants.js
const GTD_AGENT_NAMES = AGENT_NAMES;

/**
 * Copy agent files to .github/agents/.
 * These are referenced via #file: in Copilot Chat.
 * @param {string} githubDir  — path to .github/
 * @param {object} components  — { agents: Set<string>, ... }
 */
function createAgentRefs(githubDir, components) {
  const agentsDir = path.join(githubDir, 'agents');
  fs.mkdirSync(agentsDir, { recursive: true });

  // Determine which agents to install — intersection of mapped agents and Get Things Done agent files
  const requestedAgents = components ? Array.from(components.agents) : GTD_AGENT_NAMES;
  const toInstall = requestedAgents.filter(a => GTD_AGENT_NAMES.includes(a));

  // Source: pre-built Copilot agent files in templates (named without prefix, e.g. planner.md)
  const agentsSrc = path.join(TEMPLATES_DIR, 'skills', 'raep-run', '.github', 'copilot', 'agents');

  const installedSkills = components ? components.skills : new Set();

  for (const agentName of toInstall) {
    const srcFile = path.join(agentsSrc, `${agentName}.md`);
    const destFile = path.join(agentsDir, `rapidx-${agentName}.md`);
    if (!fs.existsSync(srcFile)) continue;

    const raw = fs.readFileSync(srcFile, 'utf8');
    const augmented = injectAgentSkills(raw, agentName, installedSkills, 'copilot');
    fs.writeFileSync(destFile, augmented, 'utf8');
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
  // VS Code auto-discovers .github/prompts/ — this is the standard location
  const promptsDir = path.join(githubDir, 'prompts');

  fs.mkdirSync(vscodeDir, { recursive: true });
  fs.mkdirSync(githubDir, { recursive: true });
  fs.mkdirSync(copilotDir, { recursive: true });
  fs.mkdirSync(promptsDir, { recursive: true });

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

  // ── Create skill reference files in .github/skills/ ───────────────────────
  createSkillRefs(githubDir, components);

  // ── Copy agent files to .github/agents/ ──────────────────────────────────
  createAgentRefs(githubDir, components);

  // ── Generate Copilot .prompt.md files from Get Things Done source ─────────
  // Files go to .github/prompts/ — VS Code auto-discovers this location.
  // Type /<command-name> in Copilot Chat to invoke any prompt.
  const gtdSrc = path.join(GTD_DIR, 'commands', 'gtd');
  const copilotPromptsResult = generateAllCommands(gtdSrc, {
    copilot: promptsDir,
  });
  if (copilotPromptsResult.generated > 0) {
    process.stdout.write(`  [RapidX] Generated ${copilotPromptsResult.generated} Get Things Done prompt files in .github/prompts/\n`);
  }

  // ── Generate Copilot .prompt.md files from RapidX enterprise commands ─────
  const rapidxSrc = path.join(TEMPLATES_DIR, 'commands', 'rapidx');
  if (fs.existsSync(rapidxSrc)) {
    const rapidxPromptsResult = generateAllCommands(rapidxSrc, {
      copilot: promptsDir,
    });
    if (rapidxPromptsResult.generated > 0) {
      process.stdout.write(`  [RapidX] Generated ${rapidxPromptsResult.generated} RapidX enterprise prompt files in .github/prompts/\n`);
    }
  }

  // ── Write Copilot command index prompt ────────────────────────────────────
  writeCommandsIndex(gtdSrc, {
    copilotPrompts: promptsDir,
  });

  return { success: true };
}

module.exports = { installVSCode, checkCopilotExtensions, mergeVSCodeSettings };
