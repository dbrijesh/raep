'use strict';

const path = require('path');
const componentMap = require(path.join(__dirname, 'component-map.json'));

/**
 * Add components from a mapping entry (rules/skills/agents) into the Sets.
 * @param {object} entry  - { rules?: [], skills?: [], agents?: [] }
 * @param {object} result - { rules: Set, skills: Set, agents: Set, hooks: Set }
 */
function addFromEntry(entry, result) {
  if (!entry) return;
  (entry.rules || []).forEach(r => result.rules.add(r));
  (entry.skills || []).forEach(s => result.skills.add(s));
  (entry.agents || []).forEach(a => result.agents.add(a));
}

/**
 * Map a tech stack configuration to the set of components to install.
 *
 * @param {object} stackConfig - User selections from the tech stack questionnaire.
 *   {
 *     frontend?: { framework: string, version?: string },
 *     backend?: { language: string, framework?: string, api_style?: string[] },
 *     database?: { primary?: string, orm?: string, cache?: string[] },
 *     infrastructure?: { containers?: string[], cicd?: string[] },
 *     testing?: { frameworks?: string[] },
 *     mobile?: { framework?: string },
 *     profile?: string
 *   }
 *
 * @returns {{ rules: Set, skills: Set, agents: Set, hooks: Set, skipped: { rules: string[], skills: string[], agents: string[] } }}
 */
function mapComponents(stackConfig) {
  stackConfig = stackConfig || {};

  const result = {
    rules: new Set(),
    skills: new Set(),
    agents: new Set(),
    hooks: new Set(),
  };

  // ── Always-installed components ──────────────────────────────────────────
  addFromEntry(componentMap.always, result);
  componentMap.always.hooks.forEach(h => result.hooks.add(h));

  // ── Profile-always skills ─────────────────────────────────────────────────
  addFromEntry(componentMap.profiles.always, result);

  // ── Frontend framework ────────────────────────────────────────────────────
  if (stackConfig.frontend && stackConfig.frontend.framework) {
    const fw = stackConfig.frontend.framework.toLowerCase();
    const entry = componentMap.frameworks[fw];
    if (entry) addFromEntry(entry, result);

    // Frontend implies TypeScript/JS language rules (unless backend overrides)
    if (!stackConfig.backend || !stackConfig.backend.language) {
      addFromEntry(componentMap.languages.typescript, result);
    }
  }

  // ── Backend ───────────────────────────────────────────────────────────────
  if (stackConfig.backend) {
    // Language rules + skills
    if (stackConfig.backend.language) {
      const lang = stackConfig.backend.language.toLowerCase();
      const langEntry = componentMap.languages[lang];
      if (langEntry) addFromEntry(langEntry, result);
    }

    // Backend framework skills
    if (stackConfig.backend.framework) {
      const fw = stackConfig.backend.framework.toLowerCase();
      const fwEntry = componentMap.frameworks[fw];
      if (fwEntry) addFromEntry(fwEntry, result);
    }

    // API style skills
    if (Array.isArray(stackConfig.backend.api_style)) {
      for (const style of stackConfig.backend.api_style) {
        const entry = componentMap.apiStyles[style.toLowerCase()];
        if (entry) addFromEntry(entry, result);
      }
    }
  }

  // ── Database ──────────────────────────────────────────────────────────────
  if (stackConfig.database) {
    if (stackConfig.database.primary) {
      const db = stackConfig.database.primary.toLowerCase();
      const dbEntry = componentMap.databases[db];
      if (dbEntry) addFromEntry(dbEntry, result);
    }

    if (stackConfig.database.orm) {
      const orm = stackConfig.database.orm.toLowerCase();
      const ormEntry = componentMap.orms[orm];
      if (ormEntry) addFromEntry(ormEntry, result);
    }
  }

  // ── Infrastructure ────────────────────────────────────────────────────────
  if (stackConfig.infrastructure) {
    if (Array.isArray(stackConfig.infrastructure.containers)) {
      for (const c of stackConfig.infrastructure.containers) {
        const entry = componentMap.infrastructure[c.toLowerCase()];
        if (entry) addFromEntry(entry, result);
      }
    }

    if (Array.isArray(stackConfig.infrastructure.cicd) && stackConfig.infrastructure.cicd.length > 0) {
      addFromEntry(componentMap.infrastructure.cicd, result);
    }
  }

  // ── Testing frameworks ────────────────────────────────────────────────────
  if (stackConfig.testing && Array.isArray(stackConfig.testing.frameworks)) {
    for (const fw of stackConfig.testing.frameworks) {
      const entry = componentMap.testing[fw.toLowerCase()];
      if (entry) addFromEntry(entry, result);
    }
  }

  // ── Mobile ────────────────────────────────────────────────────────────────
  if (stackConfig.mobile && stackConfig.mobile.framework) {
    const mfw = stackConfig.mobile.framework.toLowerCase();
    // Only install the exact mapped framework — no silent fallback to a different one
    const entry = componentMap.frameworks[mfw];
    if (entry) addFromEntry(entry, result);
  }

  // ── Profile-specific extras ───────────────────────────────────────────────
  // Use exact profile ID matching against known sets — substring matching can
  // cause false positives (e.g. "unregulated-startup" matching "regulated").
  const REGULATED_PROFILES = new Set([
    'pharma-regulated', 'finserv-sox', 'insurance-hipaa',
    'enterprise-standard', 'regulated',
  ]);
  const MODERNIZATION_PROFILES = new Set(['modernization', 'legacy-modernization']);

  if (stackConfig.profile) {
    const profile = stackConfig.profile.toLowerCase();
    if (REGULATED_PROFILES.has(profile)) {
      addFromEntry(componentMap.profiles.regulated, result);
    }
    if (MODERNIZATION_PROFILES.has(profile)) {
      addFromEntry(componentMap.profiles.modernization, result);
    }
  }

  // ── Compute skipped ───────────────────────────────────────────────────────
  const all = componentMap.allKnown;
  const skipped = {
    rules: all.rules.filter(r => !result.rules.has(r)),
    skills: all.skills.filter(s => !result.skills.has(s)),
    agents: all.agents.filter(a => !result.agents.has(a)),
  };

  return { ...result, skipped };
}

module.exports = { mapComponents };
