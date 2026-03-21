'use strict';

const fs = require('fs');
const path = require('path');
const { mapComponents } = require('./map-components');
const { loadAndValidate } = require('./profile-loader');
const { writeClaudeMd } = require('./generate-claude-md');
const { writeAgentsMd } = require('./generate-agents-md');
const { writeCopilotInstructions } = require('./generate-copilot-instructions');

/**
 * Read .rapidx/stack.json from a target directory.
 */
function readStackJson(targetDir) {
  const stackPath = path.join(targetDir, '.rapidx', 'stack.json');
  try {
    return JSON.parse(fs.readFileSync(stackPath, 'utf8'));
  } catch (e) {
    process.stderr.write(`[RapidX] Could not read stack.json: ${e.message}\n`);
    return null;
  }
}

/**
 * Write updated stack.json.
 */
function writeStackJson(targetDir, stack) {
  const rapidxDir = path.join(targetDir, '.rapidx');
  fs.mkdirSync(rapidxDir, { recursive: true });
  const stackPath = path.join(rapidxDir, 'stack.json');
  stack.updated_at = new Date().toISOString();
  fs.writeFileSync(stackPath, JSON.stringify(stack, null, 2), 'utf8');
  return stackPath;
}

/**
 * Compute delta components: new components not already installed.
 * @param {object} existing - { rules: string[], skills: string[], agents: string[], hooks: string[] }
 * @param {object} newComponents - { rules: Set, skills: Set, agents: Set, hooks: Set }
 * @returns {{ rules: string[], skills: string[], agents: string[], hooks: string[] }}
 */
function computeDelta(existing, newComponents) {
  const existingRules = new Set(existing.rules || []);
  const existingSkills = new Set(existing.skills || []);
  const existingAgents = new Set(existing.agents || []);
  const existingHooks = new Set(existing.hooks || []);

  return {
    rules: Array.from(newComponents.rules).filter(r => !existingRules.has(r)),
    skills: Array.from(newComponents.skills).filter(s => !existingSkills.has(s)),
    agents: Array.from(newComponents.agents).filter(a => !existingAgents.has(a)),
    hooks: Array.from(newComponents.hooks).filter(h => !existingHooks.has(h)),
  };
}

/**
 * Add technology to an existing RapidX installation.
 * @param {object} options
 * @param {string} options.targetDir
 * @param {object} options.newStackSelections - New tech stack additions
 * @param {string[]} options.platforms - Installed platforms to update
 */
function addTech(options) {
  const { targetDir, newStackSelections, platforms = [] } = options;

  // Read existing stack
  const existingStack = readStackJson(targetDir);
  if (!existingStack) {
    process.stderr.write('[RapidX] No existing stack.json found. Run the installer first.\n');
    return { success: false };
  }

  // Merge new selections into existing stack
  const mergedStack = Object.assign({}, existingStack);
  if (newStackSelections.frontend && !mergedStack.frontend) {
    mergedStack.frontend = newStackSelections.frontend;
  }
  if (newStackSelections.backend && !mergedStack.backend) {
    mergedStack.backend = newStackSelections.backend;
  }
  if (newStackSelections.database && !mergedStack.database) {
    mergedStack.database = newStackSelections.database;
  }

  // Compute new full component set
  const newComponents = mapComponents(mergedStack);

  // Compute delta
  const existing = existingStack.installed_components || { rules: [], skills: [], agents: [], hooks: [] };
  const delta = computeDelta(existing, newComponents);

  process.stdout.write('\n  Adding new components:\n');
  if (delta.rules.length) process.stdout.write(`  Rules:  ${delta.rules.join(', ')}\n`);
  if (delta.skills.length) process.stdout.write(`  Skills: ${delta.skills.join(', ')}\n`);
  if (delta.agents.length) process.stdout.write(`  Agents: ${delta.agents.join(', ')}\n`);

  // Update stack.json
  mergedStack.installed_components = {
    rules: Array.from(newComponents.rules),
    skills: Array.from(newComponents.skills),
    agents: Array.from(newComponents.agents),
    hooks: Array.from(newComponents.hooks),
  };
  writeStackJson(targetDir, mergedStack);

  // Load profile and regenerate configs
  const profileId = mergedStack.profile || 'default';
  const profile = loadAndValidate(profileId, mergedStack);

  if (platforms.includes('claude')) {
    writeClaudeMd(targetDir, profile, mergedStack, newComponents);
  }
  if (platforms.includes('vscode') || platforms.includes('copilot-cli')) {
    writeCopilotInstructions(targetDir, profile, mergedStack, newComponents);
    writeAgentsMd(targetDir, profile, mergedStack, newComponents);
  }
  if (platforms.includes('cursor')) {
    writeAgentsMd(targetDir, profile, mergedStack, newComponents);
  }

  return { success: true, delta };
}

module.exports = { addTech, readStackJson, writeStackJson, computeDelta };
