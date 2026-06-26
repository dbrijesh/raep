'use strict';

const fs = require('fs');
const path = require('path');
const { generateAllCommands } = require('./generate-commands');
const { injectAgentSkills } = require('./inject-agent-skills');
const { writeAgentsMd } = require('./generate-agents-md');
const { AGENT_NAMES, ENTERPRISE_AGENT_NAMES } = require('./constants');
const { installUnderstandAnything } = require('./install-understand-anything');

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');
const GTD_DIR = path.join(__dirname, '..', 'get-things-done');

/**
 * Convert a plain markdown rule file to Cursor's YAML frontmatter format.
 * @param {string} content - Original rule content
 * @param {string} ruleName - Rule name for the frontmatter
 * @returns {string}
 */
function toFrontmatterFormat(content, ruleName) {
  // If already has frontmatter, return as-is
  if (content.trimStart().startsWith('---')) {
    return content;
  }
  // Use the first # heading as the description — more reliable than the first non-blank line,
  // which could be a code fence, a list item, or other non-descriptive content.
  const headingMatch = content.match(/^#+\s+(.+)$/m);
  const description = headingMatch ? headingMatch[1].replace(/[*_`]/g, '').trim() : ruleName;
  return `---
description: ${description}
globs: []
alwaysApply: false
---

${content}`;
}

/**
 * Copy rules to .cursor/rules/ with YAML frontmatter conversion.
 */
function installCursorRules(rulesDir, components) {
  fs.mkdirSync(rulesDir, { recursive: true });
  const rules = components ? Array.from(components.rules) : [];

  for (const rule of rules) {
    const ruleDir = path.join(TEMPLATES_DIR, 'rules', rule);
    if (!fs.existsSync(ruleDir)) continue;

    const files = fs.readdirSync(ruleDir).filter(f => f.endsWith('.md'));
    for (const file of files) {
      const content = fs.readFileSync(path.join(ruleDir, file), 'utf8');
      const converted = toFrontmatterFormat(content, `${rule}/${file.replace('.md', '')}`);
      const destPath = path.join(rulesDir, `${rule}-${file}`);
      fs.writeFileSync(destPath, converted, 'utf8');
    }
  }
}

/**
 * Copy skills to .cursor/skills/.
 */
function installCursorSkills(skillsDir, components) {
  fs.mkdirSync(skillsDir, { recursive: true });
  const skills = components ? Array.from(components.skills) : [];

  for (const skill of skills) {
    const skillSrc = path.join(TEMPLATES_DIR, 'skills', skill);
    if (!fs.existsSync(skillSrc)) continue;

    const destSkillDir = path.join(skillsDir, skill);
    // Copy recursively — some skills (e.g. spec-driven-dev) carry subdirectories.
    copyTree(skillSrc, destSkillDir);
  }
}

/**
 * Recursively copy a directory tree.
 */
function copyTree(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyTree(s, d);
    else fs.copyFileSync(s, d);
  }
}

/**
 * Generate .cursor/mcp.json.
 */
function writeMcpJson(cursorDir, stack) {
  const mcpPath = path.join(cursorDir, 'mcp.json');
  const config = {
    version: '1.0',
    generated_by: 'rapidx-platform',
    stack: {
      frontend: (stack.frontend && stack.frontend.framework) || null,
      backend: (stack.backend && stack.backend.language) || null,
      database: (stack.database && stack.database.primary) || null,
    },
    servers: [],
  };
  fs.writeFileSync(mcpPath, JSON.stringify(config, null, 2), 'utf8');
}

// Shared agent list — see src/constants.js
const GTD_AGENT_NAMES = AGENT_NAMES;

/**
 * Copy agent MDC files to .cursor/agents/.
 * Cursor auto-suggests these when the description matches the task context.
 * Installs core agents from the pre-built MDC templates, then enterprise agents
 * from templates/agents/rapidx/ (converted to Cursor's frontmatter format).
 * @param {string} agentsDir
 * @param {object} components
 */
function installCursorAgents(agentsDir, components) {
  fs.mkdirSync(agentsDir, { recursive: true });

  const requestedAgents = components ? Array.from(components.agents) : GTD_AGENT_NAMES;
  const installedSkills = components ? components.skills : new Set();

  // Core agents — use pre-built MDC files from raep-run skill
  const agentsSrc = path.join(TEMPLATES_DIR, 'skills', 'raep-run', '.cursor', 'agents');
  for (const agentName of requestedAgents.filter(a => GTD_AGENT_NAMES.includes(a))) {
    const srcFile = path.join(agentsSrc, `rapidx-${agentName}.md`);
    const destFile = path.join(agentsDir, `rapidx-${agentName}.md`);
    if (!fs.existsSync(srcFile)) continue;
    const raw = fs.readFileSync(srcFile, 'utf8');
    const augmented = injectAgentSkills(raw, agentName, installedSkills, 'cursor');
    fs.writeFileSync(destFile, augmented, 'utf8');
  }

  // Enterprise agents — convert from templates/agents/rapidx/ to Cursor MDC format
  for (const agentName of requestedAgents.filter(a => ENTERPRISE_AGENT_NAMES.includes(a))) {
    const srcFile = path.join(TEMPLATES_DIR, 'agents', 'rapidx', `${agentName}.md`);
    const destFile = path.join(agentsDir, `rapidx-${agentName}.md`);
    if (!fs.existsSync(srcFile)) continue;
    const raw = fs.readFileSync(srcFile, 'utf8');
    const withSkills = injectAgentSkills(raw, agentName, installedSkills, 'cursor');
    const mdc = toFrontmatterFormat(withSkills, `rapidx-${agentName}`);
    fs.writeFileSync(destFile, mdc, 'utf8');
  }
}

/**
 * Install RapidX for Cursor IDE.
 */
function installCursor(options) {
  const { targetDir, profile, stack, components } = options;

  const cursorDir = path.join(targetDir, '.cursor');
  const rulesDir = path.join(cursorDir, 'rules');
  const skillsDir = path.join(cursorDir, 'skills');
  const hooksDir = path.join(cursorDir, 'hooks');

  fs.mkdirSync(cursorDir, { recursive: true });

  // Copy rules with frontmatter conversion
  installCursorRules(rulesDir, components);

  // Copy skills
  installCursorSkills(skillsDir, components);

  // Copy hook scripts to .cursor/hooks/ (recursively — includes lib/ engine).
  const hooksSrc = path.join(TEMPLATES_DIR, 'hooks', 'rapidx');
  if (fs.existsSync(hooksSrc)) {
    fs.mkdirSync(hooksDir, { recursive: true });
    let count = 0;
    const copyHooks = (src, dest) => {
      for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const s = path.join(src, entry.name);
        const d = path.join(dest, entry.name);
        if (entry.isDirectory()) { fs.mkdirSync(d, { recursive: true }); copyHooks(s, d); }
        else { fs.copyFileSync(s, d); count++; }
      }
    };
    copyHooks(hooksSrc, hooksDir);
    process.stdout.write(`  [RapidX] Installed ${count} hook scripts → .cursor/hooks/\n`);
  }

  // Generate mcp.json
  writeMcpJson(cursorDir, stack);

  // Copy RapidX agent MDC files to .cursor/agents/
  installCursorAgents(path.join(cursorDir, 'agents'), components);

  // ── Copy RapidX workflow/reference/template files to .cursor/rapidx/ ───────────
  // Cursor command files reference these via @.cursor/rapidx/... paths.
  const cursorGtdDest = path.join(cursorDir, 'rapidx');
  for (const sub of ['workflows', 'references', 'templates', 'contexts']) {
    const src = path.join(GTD_DIR, sub);
    if (!fs.existsSync(src)) continue;
    const destSub = path.join(cursorGtdDest, sub);
    fs.mkdirSync(destSub, { recursive: true });
    for (const file of fs.readdirSync(src)) {
      if (!file.endsWith('.md') && !file.endsWith('.txt')) continue;
      const content = fs.readFileSync(path.join(src, file), 'utf8');
      fs.writeFileSync(path.join(destSub, file), content.replace(/\/gsd:/g, '/rapidx:'), 'utf8');
    }
  }

  // ── Generate Cursor command files from RapidX source ─────────────
  const gtdSrc = path.join(GTD_DIR, 'commands', 'gtd');
  const cursorCommandsDir = path.join(cursorDir, 'commands', 'rapidx');
  const cursorCommandsResult = generateAllCommands(gtdSrc, {
    cursor: cursorCommandsDir,
  }, { gtdDir: GTD_DIR });
  if (cursorCommandsResult.generated > 0) {
    process.stdout.write(`  [RapidX] Generated ${cursorCommandsResult.generated} RapidX commands in .cursor/commands/rapidx/\n`);
  }

  // ── Generate Cursor command files from RapidX enterprise commands ──────────
  const rapidxSrc = path.join(TEMPLATES_DIR, 'commands', 'rapidx');
  if (fs.existsSync(rapidxSrc)) {
    const rapidxCommandsResult = generateAllCommands(rapidxSrc, {
      cursor: cursorCommandsDir,
    }, { nativeSource: true });
    if (rapidxCommandsResult.generated > 0) {
      process.stdout.write(`  [RapidX] Generated ${rapidxCommandsResult.generated} RapidX enterprise commands in .cursor/commands/rapidx/\n`);
    }
  }

  // Generate AGENTS.md
  writeAgentsMd(targetDir, profile, stack, components);

  // ── Install Understand-Anything skills and agents ──────────────────────────
  installUnderstandAnything('cursor', targetDir);

  return { success: true };
}

module.exports = { installCursor, installCursorAgents };
