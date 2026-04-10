'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Install RapidX for Antigravity.
 */
function installAntigravity(options) {
  const { targetDir, profile, stack, components } = options;

  const agentDir = path.join(targetDir, '.agent');
  fs.mkdirSync(agentDir, { recursive: true });

  const fe = stack.frontend || {};
  const be = stack.backend || {};
  const db = stack.database || {};

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

  fs.writeFileSync(path.join(agentDir, 'config.json'), JSON.stringify(config, null, 2), 'utf8');

  return { success: true };
}

module.exports = { installAntigravity };
