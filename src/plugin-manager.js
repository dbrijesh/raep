'use strict';
/**
 * plugin-manager.js
 *
 * RapidX Plugin System
 *
 * Plugins are curated bundles of agents + skills + instructions + hooks
 * for specific workflows, frameworks, or compliance domains.
 *
 * Plugin format: A directory or zip with rapidx-plugin.json manifest
 * + subdirectories: agents/, skills/, instructions/, hooks/
 *
 * Usage:
 *   /rapidx:plugin install <name>
 *   /rapidx:plugin list
 *   /rapidx:plugin remove <name>
 *   node scripts/plugin.js install <name>
 *   node scripts/plugin.js list
 */

const fs = require('fs');
const path = require('path');

const PLUGIN_REGISTRY_PATH = path.join(__dirname, '..', 'plugins', 'registry.json');
const PLUGIN_INSTALL_DIR = '.rapidx/plugins';

// ─── Built-in plugin registry ─────────────────────────────────────────────────

const BUILT_IN_PLUGINS = {
  'sdd-workflow': {
    name: 'sdd-workflow',
    version: '1.0.0',
    description: 'Spec-Driven Development full workflow bundle',
    author: 'RapidX',
    platforms: ['claude', 'vscode', 'cursor', 'codex', 'opencode'],
    components: {
      skills: ['spec-driven-dev', 'adr-management'],
      agents: ['spec-writer', 'adr-writer'],
      commands: ['spec', 'plan-spec', 'tasks-from-spec', 'constitution', 'spec-review'],
      hooks: ['spec-validator'],
      instructions: ['.github/copilot/sdd.instructions.md'],
    },
    requires: {
      rapidx: '>=1.0.0',
    },
  },

  'knowledge-engine': {
    name: 'knowledge-engine',
    version: '1.0.0',
    description: 'Codebase learning and fine-tuning system',
    author: 'RapidX',
    platforms: ['claude', 'vscode', 'cursor', 'codex', 'opencode'],
    components: {
      skills: ['codebase-learning'],
      agents: ['knowledge-curator'],
      commands: ['learn', 'learn-arch', 'fine-tune', 'knowledge-sync'],
      hooks: ['codebase-context', 'knowledge-sync'],
      scripts: ['scripts/learn-codebase.js', 'scripts/fine-tune.js'],
    },
  },

  'enterprise-governance': {
    name: 'enterprise-governance',
    version: '1.0.0',
    description: 'Enterprise governance, compliance, and audit trail bundle',
    author: 'RapidX',
    platforms: ['claude', 'vscode', 'cursor'],
    components: {
      skills: ['ai-governance', 'review-gates', 'pod-maturity'],
      agents: ['rapidx/governance-auditor', 'rapidx/compliance-checker'],
      commands: ['governance-check', 'maturity-gate', 'audit-report'],
      hooks: ['governance-gate', 'audit-trail'],
    },
    profiles: ['enterprise-standard', 'pharma-regulated', 'finserv-sox', 'insurance-hipaa'],
  },

  'frontend-react': {
    name: 'frontend-react',
    version: '1.0.0',
    description: 'React + TypeScript full-stack development bundle',
    author: 'RapidX',
    platforms: ['claude', 'vscode', 'cursor'],
    components: {
      skills: ['frontend-patterns', 'e2e-testing', 'tdd-workflow'],
      agents: ['e2e-runner', 'refactor-cleaner'],
      instructions: ['.github/copilot/frontend-react.instructions.md'],
    },
    stackRequires: {
      frontend: { framework: 'react' },
    },
  },

  'python-fastapi': {
    name: 'python-fastapi',
    version: '1.0.0',
    description: 'Python + FastAPI backend development bundle',
    author: 'RapidX',
    platforms: ['claude', 'vscode', 'cursor', 'codex'],
    components: {
      skills: ['backend-patterns', 'api-design', 'python-patterns', 'python-testing'],
      agents: ['python-reviewer'],
      instructions: ['.github/copilot/backend-python.instructions.md'],
    },
    stackRequires: {
      backend: { language: 'python', framework: 'fastapi' },
    },
  },

  'full-sdlc': {
    name: 'full-sdlc',
    version: '1.0.0',
    description: 'Complete SDLC bundle: SDD + knowledge engine + governance',
    author: 'RapidX',
    platforms: ['claude', 'vscode', 'cursor', 'codex', 'opencode'],
    includes: ['sdd-workflow', 'knowledge-engine', 'enterprise-governance'],
    components: {
      skills: [],
      agents: ['workflow-orchestrator'],
      commands: ['constitution'],
      hooks: [],
    },
  },

  'github-actions-sdlc': {
    name: 'github-actions-sdlc',
    version: '1.0.0',
    description: 'GitHub Actions workflows for AI-powered SDLC automation',
    author: 'RapidX',
    platforms: ['all'],
    components: {
      workflows: [
        '.github/workflows/rapidx-spec-check.yml',
        '.github/workflows/rapidx-pr-review.yml',
        '.github/workflows/rapidx-governance.yml',
        '.github/workflows/rapidx-knowledge-sync.yml',
      ],
    },
  },
};

// ─── Plugin operations ────────────────────────────────────────────────────────

/**
 * List all available plugins
 */
function listPlugins(installed = []) {
  const plugins = { ...BUILT_IN_PLUGINS };

  // Load external registry if it exists
  try {
    const registry = JSON.parse(fs.readFileSync(PLUGIN_REGISTRY_PATH, 'utf8'));
    Object.assign(plugins, registry.plugins || {});
  } catch { /* no external registry */ }

  return Object.values(plugins).map(p => ({
    ...p,
    installed: installed.includes(p.name),
  }));
}

/**
 * Get plugin definition by name
 */
function getPlugin(name) {
  const all = { ...BUILT_IN_PLUGINS };
  try {
    const registry = JSON.parse(fs.readFileSync(PLUGIN_REGISTRY_PATH, 'utf8'));
    Object.assign(all, registry.plugins || {});
  } catch { /* no external registry */ }
  return all[name] || null;
}

/**
 * Install a plugin into the project
 *
 * @param {string} pluginName
 * @param {string} projectRoot
 * @param {object} options - { platforms: string[], global: boolean }
 * @returns {{ installed: string[], skipped: string[], errors: string[] }}
 */
function installPlugin(pluginName, projectRoot, options = {}) {
  const plugin = getPlugin(pluginName);
  if (!plugin) {
    return { installed: [], skipped: [], errors: [`Plugin '${pluginName}' not found`] };
  }

  const result = { installed: [], skipped: [], errors: [] };

  // Handle meta-plugins that include other plugins
  if (plugin.includes) {
    for (const includedPlugin of plugin.includes) {
      const subResult = installPlugin(includedPlugin, projectRoot, options);
      result.installed.push(...subResult.installed);
      result.skipped.push(...subResult.skipped);
      result.errors.push(...subResult.errors);
    }
  }

  // Record installation in .rapidx/plugins/installed.json
  const installRecord = {
    name: plugin.name,
    version: plugin.version,
    installed_at: new Date().toISOString(),
    installed_by: 'rapidx-plugin-manager',
    components: plugin.components,
  };

  const installedPath = path.join(projectRoot, PLUGIN_INSTALL_DIR, 'installed.json');
  let installed = {};
  try { installed = JSON.parse(fs.readFileSync(installedPath, 'utf8')); } catch { installed = {}; }
  installed[pluginName] = installRecord;
  fs.mkdirSync(path.dirname(installedPath), { recursive: true });
  fs.writeFileSync(installedPath, JSON.stringify(installed, null, 2), 'utf8');

  result.installed.push(pluginName);
  return result;
}

/**
 * Remove a plugin
 */
function removePlugin(pluginName, projectRoot) {
  const installedPath = path.join(projectRoot, PLUGIN_INSTALL_DIR, 'installed.json');
  let installed = {};
  try { installed = JSON.parse(fs.readFileSync(installedPath, 'utf8')); } catch { return false; }
  if (!installed[pluginName]) return false;
  delete installed[pluginName];
  fs.writeFileSync(installedPath, JSON.stringify(installed, null, 2), 'utf8');
  return true;
}

/**
 * Get list of installed plugin names
 */
function getInstalledPlugins(projectRoot) {
  const installedPath = path.join(projectRoot, PLUGIN_INSTALL_DIR, 'installed.json');
  try {
    return Object.keys(JSON.parse(fs.readFileSync(installedPath, 'utf8')));
  } catch {
    return [];
  }
}

/**
 * Format plugin list for display
 */
function formatPluginList(plugins) {
  const lines = ['Available RapidX Plugins:\n'];
  for (const plugin of plugins) {
    const status = plugin.installed ? ' [installed]' : '';
    lines.push(`  ${plugin.name}@${plugin.version}${status}`);
    lines.push(`    ${plugin.description}`);
    lines.push(`    Platforms: ${plugin.platforms.join(', ')}`);
    lines.push('');
  }
  lines.push('Install: /rapidx:plugin install <name>');
  return lines.join('\n');
}

module.exports = {
  listPlugins,
  getPlugin,
  installPlugin,
  removePlugin,
  getInstalledPlugins,
  formatPluginList,
  BUILT_IN_PLUGINS,
};
