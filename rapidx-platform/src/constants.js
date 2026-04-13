'use strict';

/**
 * Agents that have pre-built IDE-specific agent files in templates/skills/raep-run/.
 * Used by install-cursor.js and install-vscode.js to determine which agent template
 * files to copy. Update this list whenever a new agent file is added to those directories.
 */
const AGENT_NAMES = [
  'planner', 'architect', 'tdd-guide', 'code-reviewer', 'security-reviewer',
  'build-error-resolver', 'doc-updater', 'e2e-runner', 'refactor-cleaner', 'database-reviewer',
  'spec-writer', 'knowledge-curator', 'workflow-orchestrator', 'adr-writer',
  'csharp-reviewer', 'go-reviewer', 'go-build-resolver', 'python-reviewer',
];

module.exports = { AGENT_NAMES };
