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
 * Install RapidX for Gemini CLI.
 */
function installGemini(options) {
  const { targetDir, profile, stack, components } = options;

  const geminiDir = path.join(targetDir, '.gemini');
  const skillsDir = path.join(geminiDir, 'skills');
  const agentsDir = path.join(geminiDir, 'agents');
  const commandsDir = path.join(geminiDir, 'commands', 'rapidx');
  fs.mkdirSync(geminiDir, { recursive: true });
  fs.mkdirSync(skillsDir, { recursive: true });
  fs.mkdirSync(agentsDir, { recursive: true });
  fs.mkdirSync(commandsDir, { recursive: true });

  const fe = stack.frontend || {};
  const be = stack.backend || {};
  const db = stack.database || {};

  // Generate .gemini/config.json
  const config = {
    version: '1.0',
    generated_by: 'rapidx-platform',
    profile: profile.profile_id || 'default',
    client: profile.client_name || 'RapidX Project',
    stack: {
      frontend: fe.framework || null,
      backend: be.language || null,
      database: db.primary || null,
    },
    skills: components ? Array.from(components.skills) : [],
    agents: components ? Array.from(components.agents) : [],
    workflow: 'rapidx',
  };

  fs.writeFileSync(path.join(geminiDir, 'config.json'), JSON.stringify(config, null, 2), 'utf8');

  // Write AGENTS.md for agent delegation context
  const agentsMd = generateAgentsMd(profile, stack, components);
  fs.writeFileSync(path.join(geminiDir, 'AGENTS.md'), agentsMd, 'utf8');
  fs.writeFileSync(path.join(targetDir, 'AGENTS.md'), agentsMd, 'utf8');

  // Copy selected skills
  const skills = components ? Array.from(components.skills) : [];
  for (const skill of skills) {
    const skillSrc = path.join(TEMPLATES_DIR, 'skills', skill, 'SKILL.md');
    const destPath = path.join(skillsDir, `${skill}.md`);
    if (fs.existsSync(skillSrc)) {
      fs.copyFileSync(skillSrc, destPath);
    } else {
      fs.writeFileSync(destPath, `# ${skill}\n\nSee full skill documentation.\n`, 'utf8');
    }
  }

  // Install agent definition files to .gemini/agents/
  const requestedAgents = components ? Array.from(components.agents) : AGENT_NAMES;
  const installedSkills = components ? components.skills : new Set();
  let agentCount = 0;

  for (const agentName of requestedAgents.filter(a => AGENT_NAMES.includes(a))) {
    const srcFile = path.join(TEMPLATES_DIR, 'agents', `${agentName}.md`);
    if (!fs.existsSync(srcFile)) continue;
    const raw = fs.readFileSync(srcFile, 'utf8');
    const augmented = injectAgentSkills(raw, agentName, installedSkills, 'gemini');
    fs.writeFileSync(path.join(agentsDir, `rapidx-${agentName}.md`), augmented, 'utf8');
    agentCount++;
  }

  for (const agentName of requestedAgents.filter(a => ENTERPRISE_AGENT_NAMES.includes(a))) {
    const srcFile = path.join(TEMPLATES_DIR, 'agents', 'rapidx', `${agentName}.md`);
    if (!fs.existsSync(srcFile)) continue;
    const raw = fs.readFileSync(srcFile, 'utf8');
    const augmented = injectAgentSkills(raw, agentName, installedSkills, 'gemini');
    fs.writeFileSync(path.join(agentsDir, `rapidx-${agentName}.md`), augmented, 'utf8');
    agentCount++;
  }

  if (agentCount > 0) {
    process.stdout.write(`  [RapidX] Installed ${agentCount} agent definitions → .gemini/agents/\n`);
  }

  // Generate RapidX command files
  const gtdSrc = path.join(GTD_DIR, 'commands', 'gtd');
  const gtdResult = generateAllCommands(gtdSrc, { cursor: commandsDir }, { gtdDir: GTD_DIR });
  if (gtdResult.generated > 0) {
    process.stdout.write(`  [RapidX] Generated ${gtdResult.generated} RapidX commands → .gemini/commands/rapidx/\n`);
  }

  // Generate RapidX enterprise command files
  const rapidxSrc = path.join(TEMPLATES_DIR, 'commands', 'rapidx');
  if (fs.existsSync(rapidxSrc)) {
    const rapidxResult = generateAllCommands(rapidxSrc, { cursor: commandsDir }, { gtdDir: GTD_DIR, nativeSource: true });
    if (rapidxResult.generated > 0) {
      process.stdout.write(`  [RapidX] Generated ${rapidxResult.generated} RapidX enterprise commands → .gemini/commands/rapidx/\n`);
    }
  }

  return { success: true };
}

module.exports = { installGemini };
