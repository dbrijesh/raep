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

/**
 * Understand-Anything agent names — dispatched as sub-agents by UA skills.
 * Installed to IDE agent dirs with the "ua-" prefix.
 */
const UA_AGENT_NAMES = [
  'ua-architecture-analyzer',
  'ua-article-analyzer',
  'ua-assemble-reviewer',
  'ua-domain-analyzer',
  'ua-file-analyzer',
  'ua-graph-reviewer',
  'ua-knowledge-graph-guide',
  'ua-project-scanner',
  'ua-tour-builder',
];

/**
 * Understand-Anything skill names — always installed alongside RapidX.
 */
const UA_SKILL_NAMES = [
  'understand',
  'understand-chat',
  'understand-diff',
  'understand-explain',
  'understand-onboard',
  'understand-domain',
  'understand-dashboard',
  'understand-knowledge',
];

module.exports = { AGENT_NAMES, ENTERPRISE_AGENT_NAMES, UA_AGENT_NAMES, UA_SKILL_NAMES };
