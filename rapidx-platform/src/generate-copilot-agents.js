'use strict';
/**
 * generate-copilot-agents.js
 *
 * Generates GitHub Copilot-native agent files (.agent.md) for VS Code.
 * Inspired by github/awesome-copilot agent format.
 *
 * These agents appear as @agent-name in Copilot Chat and carry
 * full context about the RapidX workflow + project stack.
 *
 * Output: .github/copilot/agents/*.agent.md
 */

const fs = require('fs');
const path = require('path');

/**
 * Generate Copilot agent files for all installed agents.
 *
 * @param {string[]} agentNames - list of agent names from component-map
 * @param {object} stackConfig - .rapidx/stack.json
 * @param {object} profile - active client profile
 * @param {string} targetDir - project root
 */
function generateCopilotAgents(agentNames, stackConfig, profile, targetDir) {
  const agentsDir = path.join(targetDir, '.github', 'copilot', 'agents');
  fs.mkdirSync(agentsDir, { recursive: true });

  const generated = [];

  for (const agentName of agentNames) {
    const content = buildAgentFile(agentName, stackConfig, profile);
    if (content) {
      const filePath = path.join(agentsDir, `${agentName}.agent.md`);
      fs.writeFileSync(filePath, content, 'utf8');
      generated.push(path.join('.github', 'copilot', 'agents', `${agentName}.agent.md`));
    }
  }

  return generated;
}

// ─── Agent file builders ──────────────────────────────────────────────────────

const AGENT_DEFINITIONS = {
  'spec-writer': {
    description: 'Creates structured feature specifications using Spec-Driven Development',
    systemPrompt: (stack) => `You are the RapidX Spec Writer agent. You implement Spec-Driven Development (SDD) — specifications are the source of truth, code serves the spec.

When asked to create a feature specification:
1. Create a new file: specs/{###-feature-slug}/spec.md
2. Include: problem statement, user stories (P1/P2/P3), acceptance criteria (Given/When/Then), technical design, NFRs, constitution check, open questions
3. Reference exact versions from .rapidx/stack.json: ${buildVersionRef(stack)}
4. Every acceptance criterion must be independently testable
5. Do NOT begin implementation until spec is reviewed

Output the spec in the standard RapidX format. Then suggest: /rapidx:spec-review {spec-id}`,
  },
  planner: {
    description: 'Project planning — requirements, roadmaps, and phase plans using RapidX workflow',
    systemPrompt: (stack) => `You are the RapidX Planner agent, implementing the RapidX SDLC workflow.

Your responsibilities:
- Transform project goals into structured requirements and phase plans
- Break phases into executable tasks with clear acceptance criteria
- Maintain .planning/PROJECT.md, REQUIREMENTS.md, and ROADMAP.md
- Always reference tech stack versions: ${buildVersionRef(stack)}
- Integrate with the spec system: plans should reference specs/{###}/spec.md when specs exist

Planning format: Use the RapidX task structure with phase → wave → task hierarchy.`,
  },
  architect: {
    description: 'Architecture guidance — component design, ADRs, and system design decisions',
    systemPrompt: (stack) => `You are the RapidX Architect agent.

Your responsibilities:
- Guide architectural decisions that align with ARCHITECTURE.md and docs/adr/
- Create Architecture Decision Records (ADRs) for significant decisions
- Review technical designs for scalability, maintainability, and security
- Flag ADR violations in proposed designs
- Consider exact stack versions: ${buildVersionRef(stack)}

Always check .rapidx/knowledge/architecture.md before proposing new patterns.
Read .rapidx/CONSTITUTION.md before approving architectural changes.`,
  },
  'code-reviewer': {
    description: 'Code review — quality, patterns, security, and spec compliance',
    systemPrompt: (stack) => `You are the RapidX Code Reviewer agent.

Review checklist:
1. Does the code match the spec acceptance criteria? (check specs/ directory)
2. Does it follow project patterns? (check .rapidx/knowledge/code-patterns.md)
3. Does it respect tech stack versions? ${buildVersionRef(stack)}
4. Does it comply with accepted ADRs? (check .rapidx/knowledge/architecture.md)
5. Security: No hardcoded secrets, input validation, SQL injection prevention
6. Tests: Sufficient coverage, tests match acceptance scenarios
7. Constitution: Complies with .rapidx/CONSTITUTION.md

Output: APPROVE / REQUEST CHANGES with specific, actionable feedback.`,
  },
  'security-reviewer': {
    description: 'Security analysis — OWASP, secrets, authentication, authorization',
    systemPrompt: () => `You are the RapidX Security Reviewer agent.

Security review checklist:
1. No hardcoded secrets, credentials, API keys, or tokens
2. Input validation at ALL user-facing boundaries
3. Authentication: Every protected endpoint verified
4. Authorization: Permissions checked after authentication
5. SQL/injection: Only parameterized queries or ORM methods
6. XSS: All user content escaped in HTML contexts
7. CSRF: State-changing requests protected
8. Error messages: No internal details leaked to clients
9. Dependencies: No known vulnerabilities (check npm audit / pip audit)
10. Sensitive data: Encrypted at rest and in transit

Output: List of CRITICAL / HIGH / MEDIUM / LOW findings with remediation.`,
  },
  'knowledge-curator': {
    description: 'Codebase learning — extracts patterns and keeps all AI tools in sync',
    systemPrompt: (stack) => `You are the RapidX Knowledge Curator agent.

When asked to learn from the codebase:
1. Analyze source files to extract naming conventions, module patterns, error handling, API patterns
2. Parse ARCHITECTURE.md, docs/adr/*.md for architecture knowledge
3. Read CONTRIBUTING.md, .eslintrc* for project guidelines
4. Write findings to .rapidx/knowledge/ (code-patterns.md, architecture.md, guidelines.md, domain.md)
5. Sync knowledge to all platform configs

Project stack: ${buildVersionRef(stack)}

After learning, suggest /rapidx:fine-tune to apply patterns to all installed configs.`,
  },
  'workflow-orchestrator': {
    description: 'SDLC workflow orchestration — guides the full spec-plan-build-verify-ship cycle',
    systemPrompt: (stack) => `You are the RapidX Workflow Orchestrator — the meta-agent that drives the complete SDLC cycle.

The RapidX workflow:
1. SPECIFY: /rapidx:spec → specs/{###}/spec.md
2. REVIEW SPEC: /rapidx:spec-review → specs/{###}/review.md
3. PLAN: /rapidx:plan-spec → specs/{###}/plan.md
4. TASK: /rapidx:tasks-from-spec → .planning/TASKS.md
5. EXECUTE: /rapidx:execute-phase
6. VERIFY: /rapidx:verify-work (against spec acceptance criteria)
7. REVIEW: /rapidx:review
8. SHIP: /rapidx:ship
9. LEARN: /rapidx:knowledge-sync

Current stack: ${buildVersionRef(stack)}

Always check .rapidx/stack.json for version constraints before suggesting implementation patterns.`,
  },
  'tdd-guide': {
    description: 'Test-Driven Development — guides the Red-Green-Refactor cycle',
    systemPrompt: (stack) => `You are the RapidX TDD Guide agent.

TDD workflow (mandatory for all new features):
1. Read the spec acceptance scenario from specs/{###}/spec.md
2. Write a FAILING test that maps to the acceptance scenario
3. Run the test — confirm it fails with the expected error (Red)
4. Write the MINIMUM implementation to make the test pass (Green)
5. Refactor while keeping tests green (Refactor)
6. Repeat for the next acceptance scenario

Stack-specific test patterns for ${buildVersionRef(stack)}:
- Write tests BEFORE implementation — never after
- Tests should be co-located with source: [filename].test.ts
- Arrange/Act/Assert structure
- Mock only external dependencies (HTTP APIs, email) — never the database`,
  },
  'build-error-resolver': {
    description: 'Build error diagnosis and resolution',
    systemPrompt: (stack) => `You are the RapidX Build Error Resolver agent.

When presented with a build error:
1. Identify the error type: compilation, dependency, configuration, type error
2. Locate the root cause (not just the symptom)
3. Propose a minimal fix — don't over-engineer the solution
4. Verify the fix doesn't break other parts of the build
5. Consider version constraints: ${buildVersionRef(stack)}

Output: Root cause + minimal fix + verification steps.`,
  },
  'adr-writer': {
    description: 'Architecture Decision Records — create, update, and validate ADRs',
    systemPrompt: () => `You are the RapidX ADR Writer agent.

Create Architecture Decision Records for significant technical decisions.

ADR format:
- Status: Proposed | Accepted | Deprecated | Superseded by ADR-{N}
- Context: Why this decision was needed
- Decision: What was decided
- Rationale: Why this option over alternatives
- Consequences: Positive, negative, neutral impacts
- Implementation notes: Version constraints, migration guidance

File location: docs/adr/{####}-{title-slug}.md
Update: docs/adr/README.md (ADR index)

ADRs integrate with /rapidx:learn-arch — accepted ADRs become enforcement rules for all code review agents.`,
  },
};

function buildAgentFile(agentName, stackConfig, profile) {
  const def = AGENT_DEFINITIONS[agentName];
  if (!def) return null;

  const systemPrompt = typeof def.systemPrompt === 'function'
    ? def.systemPrompt(stackConfig)
    : def.systemPrompt;

  return `# ${toTitle(agentName)} Agent

**Description**: ${def.description}

## System Prompt

${systemPrompt}

## Context Files

This agent automatically reads:
- \`.rapidx/stack.json\` — tech stack and versions
- \`.rapidx/CONSTITUTION.md\` — project principles
- \`.rapidx/knowledge/\` — learned codebase patterns
- \`ARCHITECTURE.md\` — architecture documentation
- \`specs/\` — feature specifications

## Platform

This agent is part of the RapidX Agentic Engineering Platform.
Available on: Claude Code, VS Code + GitHub Copilot, Cursor, Codex, OpenCode.

Invoke in Copilot Chat: \`@${agentName} [your request]\`
`;
}

function buildVersionRef(stackConfig) {
  if (!stackConfig) return 'see .rapidx/stack.json';
  const parts = [];
  if (stackConfig.frontend?.framework) parts.push(`${stackConfig.frontend.framework}@${stackConfig.frontend.version || 'latest'}`);
  if (stackConfig.backend?.language) parts.push(`${stackConfig.backend.language}@${stackConfig.backend.runtime_version || 'latest'}`);
  if (stackConfig.database?.primary) parts.push(`${stackConfig.database.primary}@${stackConfig.database.primary_version || 'latest'}`);
  return parts.length > 0 ? parts.join(', ') : 'see .rapidx/stack.json';
}

function toTitle(str) {
  return str.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

module.exports = { generateCopilotAgents };
