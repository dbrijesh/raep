'use strict';

const fs = require('fs');
const path = require('path');
const { generateAgentsMd } = require('./generate-agents-md');
const { generateAllCommands } = require('./generate-commands');
const { injectAgentSkills } = require('./inject-agent-skills');
const { AGENT_NAMES, ENTERPRISE_AGENT_NAMES } = require('./constants');

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');
const GTD_DIR = path.join(__dirname, '..', 'get-things-done');

/**
 * Install RapidX for OpenCode.
 */
function installOpencode(options) {
  const { targetDir, profile, stack, components } = options;

  const opencodeDir = path.join(targetDir, '.opencode');
  const instructionsDir = path.join(opencodeDir, 'instructions');
  const agentsDir = path.join(opencodeDir, 'agents');
  const commandsDir = path.join(opencodeDir, 'commands', 'rapidx');
  fs.mkdirSync(opencodeDir, { recursive: true });
  fs.mkdirSync(instructionsDir, { recursive: true });
  fs.mkdirSync(agentsDir, { recursive: true });
  fs.mkdirSync(commandsDir, { recursive: true });

  const fe = stack.frontend || {};
  const be = stack.backend || {};
  const db = stack.database || {};

  // Generate .opencode/opencode.json
  const config = {
    version: '1.0',
    generated_by: 'rapidx-platform',
    profile: profile.profile_id || 'default',
    client: profile.client_name || 'RapidX Project',
    stack: {
      frontend: fe.framework || null,
      frontend_version: fe.version || null,
      backend: be.language || null,
      backend_version: be.language_version || null,
      backend_framework: be.framework || null,
      database: db.primary || null,
    },
    instructions: (components ? Array.from(components.skills) : []).map(s => `instructions/${s}.md`),
    workflow: {
      engine: 'get-things-done',
      commands_dir: 'commands/rapidx',
    },
  };

  fs.writeFileSync(path.join(opencodeDir, 'opencode.json'), JSON.stringify(config, null, 2), 'utf8');

  // Write AGENTS.md for agent delegation context
  const agentsMd = generateAgentsMd(profile, stack, components);
  fs.writeFileSync(path.join(opencodeDir, 'AGENTS.md'), agentsMd, 'utf8');
  fs.writeFileSync(path.join(targetDir, 'AGENTS.md'), agentsMd, 'utf8');

  // Copy selected skills as instruction files
  const skills = components ? Array.from(components.skills) : [];
  for (const skill of skills) {
    const skillSrc = path.join(TEMPLATES_DIR, 'skills', skill, 'SKILL.md');
    const destPath = path.join(instructionsDir, `${skill}.md`);
    if (fs.existsSync(skillSrc)) {
      fs.copyFileSync(skillSrc, destPath);
    } else {
      fs.writeFileSync(destPath, `# ${skill}\n\nSee full skill documentation.\n`, 'utf8');
    }
  }

  // Install agent definition files to .opencode/agents/
  const requestedAgents = components ? Array.from(components.agents) : AGENT_NAMES;
  const installedSkills = components ? components.skills : new Set();
  let agentCount = 0;

  for (const agentName of requestedAgents.filter(a => AGENT_NAMES.includes(a))) {
    const srcFile = path.join(TEMPLATES_DIR, 'agents', `${agentName}.md`);
    if (!fs.existsSync(srcFile)) continue;
    const raw = fs.readFileSync(srcFile, 'utf8');
    const augmented = injectAgentSkills(raw, agentName, installedSkills, 'opencode');
    fs.writeFileSync(path.join(agentsDir, `rapidx-${agentName}.md`), augmented, 'utf8');
    agentCount++;
  }

  for (const agentName of requestedAgents.filter(a => ENTERPRISE_AGENT_NAMES.includes(a))) {
    const srcFile = path.join(TEMPLATES_DIR, 'agents', 'rapidx', `${agentName}.md`);
    if (!fs.existsSync(srcFile)) continue;
    const raw = fs.readFileSync(srcFile, 'utf8');
    const augmented = injectAgentSkills(raw, agentName, installedSkills, 'opencode');
    fs.writeFileSync(path.join(agentsDir, `rapidx-${agentName}.md`), augmented, 'utf8');
    agentCount++;
  }

  if (agentCount > 0) {
    process.stdout.write(`  [RapidX] Installed ${agentCount} agent definitions → .opencode/agents/\n`);
  }

  // Generate RapidX command files
  const gtdSrc = path.join(GTD_DIR, 'commands', 'gtd');
  const gtdResult = generateAllCommands(gtdSrc, { cursor: commandsDir }, { gtdDir: GTD_DIR });
  if (gtdResult.generated > 0) {
    process.stdout.write(`  [RapidX] Generated ${gtdResult.generated} RapidX commands → .opencode/commands/rapidx/\n`);
  }

  // Generate RapidX enterprise command files
  const rapidxSrc = path.join(TEMPLATES_DIR, 'commands', 'rapidx');
  if (fs.existsSync(rapidxSrc)) {
    const rapidxResult = generateAllCommands(rapidxSrc, { cursor: commandsDir }, { gtdDir: GTD_DIR, nativeSource: true });
    if (rapidxResult.generated > 0) {
      process.stdout.write(`  [RapidX] Generated ${rapidxResult.generated} RapidX enterprise commands → .opencode/commands/rapidx/\n`);
    }
  }

  return { success: true };
}

module.exports = { installOpencode };
