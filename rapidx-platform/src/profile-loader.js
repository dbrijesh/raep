'use strict';

const fs = require('fs');
const path = require('path');

const PROFILES_DIR = path.join(__dirname, '..', 'profiles');

/**
 * List available profile IDs by scanning the profiles directory.
 * @returns {string[]}
 */
function listProfiles() {
  try {
    return fs.readdirSync(PROFILES_DIR)
      .filter(f => f.endsWith('.json') && !f.startsWith('_'))
      .map(f => f.replace('.json', ''));
  } catch (e) {
    process.stderr.write(`[RapidX] Could not list profiles: ${e.message}\n`);
    return [];
  }
}

/**
 * Load a profile by ID, merged with any stack.json data.
 * @param {string} profileId
 * @param {object} [stackData] - Optional stack.json data to merge into profile
 * @returns {object|null}
 */
function loadProfile(profileId, stackData) {
  const profilePath = path.join(PROFILES_DIR, `${profileId}.json`);

  let profile;
  try {
    const text = fs.readFileSync(profilePath, 'utf8');
    profile = JSON.parse(text);
  } catch (e) {
    process.stderr.write(`[RapidX] Could not load profile "${profileId}": ${e.message}\n`);
    return null;
  }

  // Merge with stack data if provided
  if (stackData) {
    profile = Object.assign({}, profile, {
      _stack: stackData,
    });
  }

  return profile;
}

/**
 * Validate that a profile object has all required fields.
 * @param {object} profile
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateProfile(profile) {
  const errors = [];
  const required = ['profile_id', 'version', 'engagement', 'rules', 'skills', 'agents', 'hooks'];

  for (const field of required) {
    if (!(field in profile)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  if (profile.engagement) {
    const validTypes = ['greenfield', 'modernization', 'maintenance', 'migration'];
    if (profile.engagement.type && !validTypes.includes(profile.engagement.type)) {
      errors.push(`engagement.type must be one of: ${validTypes.join(', ')}`);
    }

    const validMaturity = ['L0', 'L1', 'L2', 'L3', 'L4'];
    if (profile.engagement.maturity_level && !validMaturity.includes(profile.engagement.maturity_level)) {
      errors.push(`engagement.maturity_level must be one of: ${validMaturity.join(', ')}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Load and validate a profile, falling back to 'default' if not found.
 * @param {string} profileId
 * @param {object} [stackData]
 * @returns {object}
 */
function loadAndValidate(profileId, stackData) {
  let profile = loadProfile(profileId, stackData);

  if (!profile) {
    process.stderr.write(`[RapidX] Falling back to default profile\n`);
    profile = loadProfile('default', stackData);
  }

  if (!profile) {
    // Return minimal default to avoid crashing
    return {
      profile_id: 'default',
      client_name: 'Default Client',
      version: '1.0.0',
      engagement: { type: 'greenfield', maturity_level: 'L1' },
      rules: ['common'],
      skills: ['coding-standards', 'security-review', 'tdd-workflow'],
      agents: ['planner', 'architect'],
      hooks: ['session-start', 'audit-trail'],
      _stack: stackData || {},
    };
  }

  const validation = validateProfile(profile);
  if (!validation.valid) {
    process.stderr.write(`[RapidX] Profile validation warnings for "${profileId}":\n`);
    validation.errors.forEach(e => process.stderr.write(`  - ${e}\n`));
    // Coerce missing array fields to empty arrays so downstream iterators don't crash
    for (const field of ['rules', 'skills', 'agents', 'hooks']) {
      if (!Array.isArray(profile[field])) profile[field] = [];
    }
  }

  return profile;
}

module.exports = { listProfiles, loadProfile, validateProfile, loadAndValidate };
