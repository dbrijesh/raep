'use strict';

const fs = require('fs');
const path = require('path');
const { generateAgentsMd } = require('./generate-agents-md');

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

/**
 * Install RapidX for Gemini CLI.
 */
function installGemini(options) {
  const { targetDir, profile, stack, components } = options;

  const geminiDir = path.join(targetDir, '.gemini');
  const skillsDir = path.join(geminiDir, 'skills');
  fs.mkdirSync(geminiDir, { recursive: true });
  fs.mkdirSync(skillsDir, { recursive: true });

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
    workflow: 'get-things-done',
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

  return { success: true };
}

module.exports = { installGemini };
