'use strict';

/**
 * Core agents that have pre-built IDE-specific files in templates/skills/raep-run/
 * and standalone definitions in templates/agents/*.md.
 * Used by all IDE installers to determine which agent files to install.
 */
const AGENT_NAMES = [
  'planner', 'architect', 'tdd-guide', 'code-reviewer', 'security-reviewer',
  'build-error-resolver', 'doc-updater', 'e2e-runner', 'refactor-cleaner', 'database-reviewer',
  'spec-writer', 'knowledge-curator', 'workflow-orchestrator', 'adr-writer',
  'csharp-reviewer', 'go-reviewer', 'go-build-resolver', 'python-reviewer',
];

/**
 * Enterprise agents — only present in templates/agents/rapidx/*.md.
 * Installed for all IDEs alongside core agents when components.agents includes them.
 */
const ENTERPRISE_AGENT_NAMES = [
  'client-onboarder', 'compliance-checker', 'governance-auditor', 'migration-analyst',
  'invariant-catalog',
];

module.exports = { AGENT_NAMES, ENTERPRISE_AGENT_NAMES };
