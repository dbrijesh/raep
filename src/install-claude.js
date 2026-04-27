'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { writeClaudeMd } = require('./generate-claude-md');
const { generateAllCommands } = require('./generate-commands');
const { writeCommandsIndex } = require('./generate-commands-index');
const { injectAgentSkills } = require('./inject-agent-skills');
const { AGENT_NAMES, ENTERPRISE_AGENT_NAMES } = require('./constants');

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

// Text file extensions to rewrite during GTD engine installation
const TEXT_EXTS = new Set(['.md', '.txt', '.json', '.toml', '.yaml', '.yml']);

// All substitutions applied to GTD engine text files when installing to ~/.claude/
// Order matters: longer/more-specific patterns before shorter ones to avoid partial matches.
const GTD_REWRITES = [
  [/\/gsd:/g,                          '/rapidx:'],
  [/gsd-tools\.cjs/g,                  'rapidx-tools.cjs'],
  [/gsd-advisor-researcher/g,          'rapidx-advisor-researcher'],
  [/gsd-ai-researcher/g,               'rapidx-ai-researcher'],
  [/gsd-assumptions-analyzer/g,        'rapidx-assumptions-analyzer'],
  [/gsd-code-fixer/g,                  'rapidx-code-fixer'],
  [/gsd-code-reviewer/g,               'rapidx-code-reviewer'],
  [/gsd-codebase-mapper/g,             'rapidx-codebase-mapper'],
  [/gsd-debug-session-manager/g,       'rapidx-debug-session-manager'],
  [/gsd-debugger/g,                    'rapidx-debugger'],
  [/gsd-doc-classifier/g,              'rapidx-doc-classifier'],
  [/gsd-doc-synthesizer/g,             'rapidx-doc-synthesizer'],
  [/gsd-doc-verifier/g,                'rapidx-doc-verifier'],
  [/gsd-doc-writer/g,                  'rapidx-doc-writer'],
  [/gsd-domain-researcher/g,           'rapidx-domain-researcher'],
  [/gsd-eval-auditor/g,                'rapidx-eval-auditor'],
  [/gsd-eval-planner/g,                'rapidx-eval-planner'],
  [/gsd-executor/g,                    'rapidx-executor'],
  [/gsd-framework-selector/g,          'rapidx-framework-selector'],
  [/gsd-integration-checker/g,         'rapidx-integration-checker'],
  [/gsd-intel-updater/g,               'rapidx-intel-updater'],
  [/gsd-nyquist-auditor/g,             'rapidx-nyquist-auditor'],
  [/gsd-pattern-mapper/g,              'rapidx-pattern-mapper'],
  [/gsd-phase-researcher/g,            'rapidx-phase-researcher'],
  [/gsd-plan-checker/g,                'rapidx-plan-checker'],
  [/gsd-planner/g,                     'rapidx-planner'],
  [/gsd-project-researcher/g,          'rapidx-project-researcher'],
  [/gsd-research-synthesizer/g,        'rapidx-research-synthesizer'],
  [/gsd-roadmapper/g,                  'rapidx-roadmapper'],
  [/gsd-security-auditor/g,            'rapidx-security-auditor'],
  [/gsd-ui-auditor/g,                  'rapidx-ui-auditor'],
  [/gsd-ui-checker/g,                  'rapidx-ui-checker'],
  [/gsd-ui-researcher/g,               'rapidx-ui-researcher'],
  [/gsd-user-profiler/g,               'rapidx-user-profiler'],
  [/gsd-verifier/g,                    'rapidx-verifier'],
  [/gsd-sdk/g,                         'rapidx-sdk'],
  [/gsd-workspaces/g,                  'rapidx-workspaces'],
  [/gsd-local-patches/g,               'rapidx-local-patches'],
];

/**
 * Apply all GTD→RapidX substitutions to a text file's content.
 */
function rewriteGtdContent(content) {
  let out = content;
  for (const [pattern, replacement] of GTD_REWRITES) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

/**
 * Copy the GTD engine directory to dest, rewriting legacy gsd- refs in text files.
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
      fs.writeFileSync(destPath, rewriteGtdContent(content), 'utf8');
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
  const skillsDir = path.join(claudeDir, 'skills');
  const agentsDir = path.join(claudeDir, 'agents');

  fs.mkdirSync(rapidxCommandsDir, { recursive: true });
  fs.mkdirSync(hooksDir, { recursive: true });
  fs.mkdirSync(skillsDir, { recursive: true });
  fs.mkdirSync(agentsDir, { recursive: true });

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
  // Source files stay in get-things-done/commands/gtd/ (vendor source).
  // generateAllCommands rewrites all legacy /gsd: command refs to /rapidx: on output.
  const gtdSrc = path.join(GTD_DIR, 'commands', 'gtd');
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

  // ── Install skills to .claude/skills/ ────────────────────────────────────
  const skills = components ? Array.from(components.skills) : [];
  for (const skill of skills) {
    const skillSrc = path.join(TEMPLATES_DIR, 'skills', skill, 'SKILL.md');
    const destSkillDir = path.join(skillsDir, skill);
    fs.mkdirSync(destSkillDir, { recursive: true });
    const destPath = path.join(destSkillDir, 'SKILL.md');
    if (fs.existsSync(skillSrc)) {
      fs.copyFileSync(skillSrc, destPath);
    } else {
      fs.writeFileSync(destPath, `# Skill: ${skill}\n\nSee full skill documentation.\n`, 'utf8');
    }
  }
  if (skills.length > 0) {
    process.stdout.write(`  [RapidX] Installed ${skills.length} skills → .claude/skills/\n`);
  }

  // ── Install agent definitions to .claude/agents/ ──────────────────────────
  const installedSkills = components ? components.skills : new Set();
  const requestedAgents = components ? Array.from(components.agents) : AGENT_NAMES;
  let agentCount = 0;

  // Core agents from templates/agents/
  for (const agentName of requestedAgents.filter(a => AGENT_NAMES.includes(a))) {
    const srcFile = path.join(TEMPLATES_DIR, 'agents', `${agentName}.md`);
    if (!fs.existsSync(srcFile)) continue;
    const raw = fs.readFileSync(srcFile, 'utf8');
    const augmented = injectAgentSkills(raw, agentName, installedSkills, 'claude');
    fs.writeFileSync(path.join(agentsDir, `rapidx-${agentName}.md`), augmented, 'utf8');
    agentCount++;
  }

  // Enterprise agents from templates/agents/rapidx/
  for (const agentName of requestedAgents.filter(a => ENTERPRISE_AGENT_NAMES.includes(a))) {
    const srcFile = path.join(TEMPLATES_DIR, 'agents', 'rapidx', `${agentName}.md`);
    if (!fs.existsSync(srcFile)) continue;
    const raw = fs.readFileSync(srcFile, 'utf8');
    const augmented = injectAgentSkills(raw, agentName, installedSkills, 'claude');
    fs.writeFileSync(path.join(agentsDir, `rapidx-${agentName}.md`), augmented, 'utf8');
    agentCount++;
  }

  if (agentCount > 0) {
    process.stdout.write(`  [RapidX] Installed ${agentCount} agent definitions → .claude/agents/\n`);
  }

  // ── Merge settings.json ────────────────────────────────────────────────────
  const settingsPath = path.join(claudeDir, 'settings.json');
  mergeClaudeSettings(settingsPath, components);

  // ── Generate CLAUDE.md ─────────────────────────────────────────────────────
  writeClaudeMd(targetDir, profile, stack, components);

  return { success: true };
}

module.exports = { installClaude };
