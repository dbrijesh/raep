'use strict';

const fs = require('fs');
const path = require('path');

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

/**
 * Install RapidX for OpenCode.
 */
function installOpencode(options) {
  const { targetDir, profile, stack, components } = options;

  const opencodeDir = path.join(targetDir, '.opencode');
  const instructionsDir = path.join(opencodeDir, 'instructions');
  fs.mkdirSync(opencodeDir, { recursive: true });
  fs.mkdirSync(instructionsDir, { recursive: true });

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
    },
  };

  fs.writeFileSync(path.join(opencodeDir, 'opencode.json'), JSON.stringify(config, null, 2), 'utf8');

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

  return { success: true };
}

module.exports = { installOpencode };
