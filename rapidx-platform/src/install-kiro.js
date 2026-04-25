'use strict';

const fs = require('fs');
const path = require('path');
const { generateAgentsMd } = require('./generate-agents-md');
const { generateAllCommands, rewriteCommandRefs } = require('./generate-commands');

const GTD_DIR = path.join(__dirname, '..', 'get-things-done');

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

// ── Skill descriptions for Kiro activation matching ───────────────────────────
const SKILL_DESCRIPTIONS = {
  'coding-standards':      'Apply RapidX coding standards, conventions, and style rules to code.',
  'security-review':       'Review code for security vulnerabilities, OWASP issues, and insecure patterns.',
  'tdd-workflow':          'Guide test-driven development: red-green-refactor cycles and test-first design.',
  'strategic-compact':     'Apply strategic prompting and context compaction for complex multi-step tasks.',
  'search-first':          'Search codebase before writing — locate existing patterns before adding new code.',
  'verification-loop':     'Verify changes work correctly with a structured test-and-verify loop.',
  'spec-driven-dev':       'Create and work from executable specifications with EARS-notation requirements.',
  'codebase-learning':     'Learn and document codebase architecture, patterns, and conventions.',
  'cross-platform-commands': 'Generate and manage RapidX commands across all supported IDE platforms.',
  'adr-management':        'Write and manage Architecture Decision Records for design decisions.',
  'frontend-patterns':     'Apply frontend design patterns, component architecture, and UI best practices.',
  'backend-patterns':      'Apply backend design patterns, service architecture, and API best practices.',
  'api-design':            'Design and review REST, GraphQL, gRPC, and tRPC APIs to OpenAPI standards.',
  'e2e-testing':           'Write and run end-to-end tests with Playwright or Cypress.',
  'postgres-patterns':     'PostgreSQL schema design, query optimisation, and indexing patterns.',
  'database-migrations':   'Write safe, reversible database migrations with rollback strategies.',
  'docker-patterns':       'Dockerise applications, write Compose files, and follow container best practices.',
  'deployment-patterns':   'Kubernetes, CI/CD pipelines, and cloud deployment workflows.',
  'golang-patterns':       'Idiomatic Go code patterns, interfaces, and concurrency best practices.',
  'golang-testing':        'Go testing: table-driven tests, mocks, benchmarks, and race detection.',
  'python-patterns':       'Idiomatic Python patterns, type hints, and async programming.',
  'python-testing':        'Python testing with pytest, fixtures, mocking, and coverage.',
  'django-patterns':       'Django models, views, serializers, and MTV architecture patterns.',
  'django-security':       'Django security: CSRF, auth, permissions, and secure configuration.',
  'django-tdd':            'Test-driven Django development with Django TestCase and pytest-django.',
  'django-verification':   'Verify Django application correctness across models, views, and APIs.',
  'springboot-patterns':   'Spring Boot application patterns, beans, and dependency injection.',
  'springboot-security':   'Spring Security configuration, JWT, and OAuth2 patterns.',
  'springboot-tdd':        'Test-driven Spring Boot development with JUnit and Mockito.',
  'springboot-verification': 'Verify Spring Boot application correctness and integration.',
  'java-coding-standards': 'Java coding standards, OOP patterns, and clean code principles.',
  'jpa-patterns':          'JPA entity design, JPQL queries, and ORM best practices.',
  'laravel-patterns':      'Laravel MVC patterns, Eloquent ORM, and artisan commands.',
  'laravel-security':      'Laravel security: authentication, authorisation, and XSS/CSRF protection.',
  'laravel-tdd':           'Test-driven Laravel development with PHPUnit and feature tests.',
  'laravel-verification':  'Verify Laravel application correctness across routes, controllers, and models.',
  'dotnet-patterns':       '.NET and C# application patterns, SOLID principles, and clean architecture.',
  'dotnet-security':       'ASP.NET Core security, identity, and secure API design.',
  'dotnet-tdd':            'Test-driven .NET development with xUnit, NUnit, and Moq.',
  'dotnet-verification':   'Verify .NET application correctness with integration and unit tests.',
  'swift-actor-persistence': 'Swift Actor model, Swift Data persistence, and concurrency patterns.',
  'swift-protocol-di-testing': 'Swift protocol-oriented design, dependency injection, and testing.',
  'swift-concurrency-6-2': 'Swift 6.2 concurrency: async/await, Sendable, and structured concurrency.',
  'liquid-glass-design':   'Apple Liquid Glass UI design system patterns for iOS and macOS.',
  'foundation-models-on-device': 'On-device Foundation Models integration for iOS/macOS AI features.',
  'cpp-coding-standards':  'C++ coding standards, modern C++17/20 patterns, and safe practices.',
  'cpp-testing':           'C++ testing with Google Test, Catch2, and sanitisers.',
  'perl-patterns':         'Modern Perl patterns, Moose/Moo OOP, and idiomatic practices.',
  'perl-security':         'Perl security: taint mode, input validation, and secure file handling.',
  'perl-testing':          'Perl testing with Test::More, Test::MockObject, and Devel::Cover.',
  'ai-governance':         'AI agent governance, review gates, compliance checks, and audit trails.',
  'client-onboarding':     'Client onboarding checklists, environment setup, and team ramp-up.',
  'review-gates':          'Quality gates, approval workflows, and code review checklists.',
  'pod-maturity':          'Engineering pod maturity assessment and progression guidance.',
  'architecture-copilot':  'Architecture copilot for system design, ADRs, and technical strategy.',
  'migration-framework':   'Legacy system modernisation and incremental migration strategies.',
};

// ── Power definitions — each major agent becomes a Kiro power ─────────────────
const POWER_DEFINITIONS = {
  planner: {
    displayName: 'RapidX Planner',
    description: 'Plans project phases, roadmaps, and requirements using Get Things Done methodology.',
    keywords: ['plan', 'planning', 'roadmap', 'requirements', 'feature', 'milestone', 'sprint', 'backlog'],
    steeringFiles: ['planning-workflow.md'],
  },
  architect: {
    displayName: 'RapidX Architect',
    description: 'System design, architecture decisions, and technical roadmaps for enterprise projects.',
    keywords: ['architecture', 'design', 'system design', 'ADR', 'patterns', 'scalability', 'microservices'],
    steeringFiles: ['architecture-workflow.md'],
  },
  'tdd-guide': {
    displayName: 'RapidX TDD Guide',
    description: 'Test-driven development guidance using red-green-refactor cycles.',
    keywords: ['tdd', 'test driven', 'unit test', 'test first', 'red green refactor', 'coverage'],
    steeringFiles: ['tdd-workflow.md'],
  },
  'code-reviewer': {
    displayName: 'RapidX Code Reviewer',
    description: 'Code quality review, PR review, and quality gate enforcement.',
    keywords: ['review', 'code review', 'PR', 'pull request', 'quality', 'lint', 'standards'],
    steeringFiles: ['review-workflow.md'],
  },
  'security-reviewer': {
    displayName: 'RapidX Security Reviewer',
    description: 'Security analysis, vulnerability detection, and OWASP compliance review.',
    keywords: ['security', 'vulnerability', 'OWASP', 'auth', 'authentication', 'injection', 'XSS', 'CVE'],
    steeringFiles: ['security-workflow.md'],
  },
  'build-error-resolver': {
    displayName: 'RapidX Build Fixer',
    description: 'Diagnoses and resolves build errors, compilation failures, and CI/CD issues.',
    keywords: ['build error', 'compile error', 'CI failure', 'pipeline error', 'module not found', 'cannot find'],
    steeringFiles: [],
  },
  'doc-updater': {
    displayName: 'RapidX Doc Updater',
    description: 'Keeps documentation in sync with code changes.',
    keywords: ['documentation', 'docs', 'README', 'docstring', 'JSDoc', 'update docs', 'comment'],
    steeringFiles: [],
  },
  'spec-writer': {
    displayName: 'RapidX Spec Writer',
    description: 'Writes executable specifications with EARS notation, requirements, and design docs.',
    keywords: ['spec', 'specification', 'requirements', 'EARS', 'design doc', 'RFC', 'PRD'],
    steeringFiles: ['spec-workflow.md'],
  },
  'knowledge-curator': {
    displayName: 'RapidX Knowledge Curator',
    description: 'Captures and curates project knowledge, decisions, and team conventions.',
    keywords: ['knowledge', 'decision', 'convention', 'pattern', 'learn', 'capture', 'document decision'],
    steeringFiles: [],
  },
  'workflow-orchestrator': {
    displayName: 'RapidX Workflow Orchestrator',
    description: 'Orchestrates multi-agent Get Things Done SDLC workflows end-to-end.',
    keywords: ['workflow', 'orchestrate', 'pipeline', 'SDLC', 'end to end', 'GTD', 'get things done'],
    steeringFiles: ['gtd-workflow.md'],
  },
};

// ── Steering file content generators ──────────────────────────────────────────

/**
 * Generate a steering file for always-on tech stack context.
 */
function generateTechStackSteering(profile, stack) {
  const fe = stack.frontend || {};
  const be = stack.backend || {};
  const db = stack.database || {};
  const infra = stack.infrastructure || {};
  const clientName = profile.client_name || 'RapidX Project';

  const lines = [
    `# Tech Stack Context — ${clientName}`,
    '',
    '> Always-on context for all Kiro sessions in this workspace.',
    '',
    '## Active Tech Stack',
    '',
  ];

  if (fe.framework) {
    lines.push(`**Frontend:** ${fe.framework}${fe.version ? ' ' + fe.version : ''}`);
    if (fe.ui_library && fe.ui_library.length) lines.push(`**UI Library:** ${fe.ui_library.join(', ')}`);
    if (fe.state_management && fe.state_management.length) lines.push(`**State:** ${fe.state_management.join(', ')}`);
  }
  if (be.language) {
    lines.push(`**Backend:** ${be.language}${be.language_version ? ' ' + be.language_version : ''}`);
    if (be.framework) lines.push(`**Framework:** ${be.framework}${be.framework_version ? ' ' + be.framework_version : ''}`);
  }
  if (db.primary) {
    lines.push(`**Database:** ${db.primary}${db.primary_version ? ' ' + db.primary_version : ''}`);
    if (db.orm) lines.push(`**ORM:** ${db.orm}`);
    if (db.cache) lines.push(`**Cache:** ${db.cache}`);
  }
  if (infra.cloud) lines.push(`**Cloud:** ${infra.cloud}`);
  if (infra.containers && infra.containers.length) lines.push(`**Containers:** ${infra.containers.join(', ')}`);
  if (infra.cicd && infra.cicd.length) lines.push(`**CI/CD:** ${infra.cicd.join(', ')}`);

  lines.push('');
  lines.push('## Version Constraints');
  lines.push('');
  lines.push('Use only features available in the versions listed above.');
  lines.push('Do NOT suggest APIs, syntax, or patterns introduced in newer versions.');
  if (fe.framework && fe.version) {
    lines.push(`- ${fe.framework}: use ${fe.version} patterns only`);
  }
  if (be.language && be.language_version) {
    lines.push(`- ${be.language}: target ${be.language_version} compatibility`);
  }
  if (be.framework && be.framework_version) {
    lines.push(`- ${be.framework}: use ${be.framework_version} APIs only`);
  }

  lines.push('');
  lines.push('## Profile');
  lines.push('');
  lines.push(`- Client: ${clientName}`);
  lines.push(`- Profile ID: ${profile.profile_id || 'default'}`);
  if (profile.engagement && profile.engagement.maturity_level) {
    lines.push(`- Maturity: ${profile.engagement.maturity_level}`);
  }

  return lines.join('\n');
}

/**
 * Generate a steering file for coding standards.
 */
function generateCodingStandardsSteering(stack) {
  const be = stack.backend || {};
  const fe = stack.frontend || {};

  return `# Coding Standards

> Applied to all code in this workspace.

## General Rules

- Follow SOLID principles and clean code practices
- Write self-documenting code — names should explain intent
- No magic numbers or strings — use named constants
- Functions should do one thing; keep them under 40 lines
- Error handling at system boundaries (user input, external APIs) only
- Never suppress errors silently — log with context or rethrow

## ${be.language === 'typescript' || be.language === 'javascript' || fe.framework ? 'TypeScript / JavaScript' : (be.language || 'Language')}-Specific

${be.language === 'typescript' || fe.framework === 'react' || fe.framework === 'nextjs' ? `- Strict TypeScript — \`strict: true\` in tsconfig, no \`any\` without comment
- Prefer \`const\` over \`let\`, never \`var\`
- Async/await over raw Promises; always handle rejections
- Named exports preferred over default exports for tree-shaking` : ''}
${be.language === 'python' ? `- Type hints on all public functions and class attributes
- Prefer \`pathlib\` over \`os.path\`
- Use \`dataclasses\` or Pydantic for structured data
- Follow PEP 8; max line length 88 (Black formatter)` : ''}
${be.language === 'go' ? `- \`gofmt\` and \`golangci-lint\` must pass
- Return errors, don't panic in library code
- Table-driven tests for all public functions
- Document all exported identifiers` : ''}

## Testing

- Write tests before fixing bugs (TDD)
- Unit tests for business logic; integration tests for external boundaries
- Test names: \`should [do something] when [condition]\`
- Aim for 80%+ coverage on business-critical paths

## Git

- Conventional Commits: \`feat:\`, \`fix:\`, \`chore:\`, \`docs:\`, \`test:\`
- No debug code, console.log, or TODO comments in committed code
- Each PR should be one logical change`;
}

// ── Steering file content for power workflows ──────────────────────────────────

const POWER_STEERING_CONTENT = {
  'planning-workflow.md': `# Planning Workflow

## When to Use
Activate the Planner when starting new features, planning sprints, or breaking down complex requirements.

## Steps
1. Clarify the goal and success criteria
2. Identify constraints (time, tech stack, dependencies)
3. Break into milestones with acceptance criteria
4. Create tasks with effort estimates
5. Flag risks and dependencies

## Output Format
- Summary of the feature/goal
- Milestone list with acceptance criteria
- Task breakdown (can feed into spec-driven-dev skill)
- Risk register`,

  'architecture-workflow.md': `# Architecture Workflow

## When to Use
Activate the Architect for system design decisions, new service design, or scaling problems.

## Steps
1. Understand current state and constraints
2. Define quality attributes (performance, availability, security)
3. Identify architectural options
4. Evaluate trade-offs
5. Document decision as an ADR

## Output Format
- Context and problem statement
- Options considered with pros/cons
- Recommended approach with rationale
- ADR in the project's ADR directory`,

  'tdd-workflow.md': `# TDD Workflow

## Red-Green-Refactor Cycle
1. **Red** — Write a failing test that captures the requirement
2. **Green** — Write the minimal code to make it pass
3. **Refactor** — Improve the code without changing behaviour

## Rules
- Never write production code without a failing test first
- Each test should test one concept
- Tests are executable documentation — name them clearly
- Run the full test suite before declaring done`,

  'review-workflow.md': `# Code Review Workflow

## Review Checklist
- [ ] Logic is correct and handles edge cases
- [ ] No security vulnerabilities (injection, XSS, broken auth)
- [ ] Error handling is appropriate
- [ ] Tests cover the change and pass
- [ ] Code follows project conventions
- [ ] No unnecessary complexity or duplication
- [ ] Documentation updated if public API changed

## Severity Levels
- **Blocker**: Security issues, data loss risk, broken tests
- **Major**: Logic bugs, missing error handling, poor design
- **Minor**: Style, naming, minor refactoring suggestions`,

  'security-workflow.md': `# Security Review Workflow

## OWASP Top 10 Checklist
- [ ] Injection (SQL, NoSQL, command)
- [ ] Broken Authentication
- [ ] Sensitive Data Exposure
- [ ] XML External Entities
- [ ] Broken Access Control
- [ ] Security Misconfiguration
- [ ] XSS (Cross-Site Scripting)
- [ ] Insecure Deserialization
- [ ] Known Vulnerable Components
- [ ] Insufficient Logging

## Always Check
- Input validation at all entry points
- Output encoding before rendering
- Authentication and authorisation on every endpoint
- Secrets not committed to source control
- Dependencies scanned for CVEs`,

  'spec-workflow.md': `# Spec-Driven Development Workflow

## EARS Notation
- **Ubiquitous**: The system shall [requirement]
- **Event-driven**: When [trigger], the system shall [response]
- **State-driven**: While [state], the system shall [requirement]
- **Conditional**: If [condition], then the system shall [requirement]

## Spec Structure
1. Overview (what and why)
2. Requirements (EARS notation)
3. Design (architecture, data model, APIs)
4. Implementation Plan (sequenced tasks)
5. Test Plan (acceptance criteria)`,

  'gtd-workflow.md': `# Get Things Done — SDLC Workflow

## Pipeline Stages
1. **Plan** → Requirements, ADRs, task breakdown
2. **Build** → TDD implementation with spec reference
3. **Review** → Code review + security scan
4. **Test** → E2E tests, integration tests
5. **Ship** → Deployment, monitoring, docs

## Commands Available
- \`/rapidx:plan-phase\` — Start a planning session
- \`/rapidx:execute-phase\` — Build and execute a phase
- \`/rapidx:review\` — Start a review session
- \`/rapidx:verify-work\` — Run the test and verify loop
- \`/rapidx:ship\` — Prepare for deployment
- \`/rapidx:spec\` — Generate a spec
- \`/rapidx:adr\` — Write an ADR`,
};

// ── Installers ────────────────────────────────────────────────────────────────

/**
 * Install RapidX skills as Kiro workspace skills in .kiro/skills/.
 * Each skill gets a directory with a SKILL.md file in Kiro's format.
 */
function installKiroSkills(kiroSkillsDir, components) {
  fs.mkdirSync(kiroSkillsDir, { recursive: true });
  const skills = components ? Array.from(components.skills) : [];

  for (const skillName of skills) {
    const destSkillDir = path.join(kiroSkillsDir, skillName);
    fs.mkdirSync(destSkillDir, { recursive: true });

    // Try to read existing SKILL.md from templates
    const srcSkillMd = path.join(TEMPLATES_DIR, 'skills', skillName, 'SKILL.md');
    let skillBody = '';

    if (fs.existsSync(srcSkillMd)) {
      const raw = fs.readFileSync(srcSkillMd, 'utf8');
      // Strip any existing frontmatter, rewrite legacy /gsd: refs to /rapidx:
      skillBody = rewriteCommandRefs(raw.replace(/^---[\s\S]*?---\n?/, '').trim());
    } else {
      skillBody = `## ${skillName}\n\nSee RapidX documentation for full guidance on this skill.`;
    }

    const description = SKILL_DESCRIPTIONS[skillName] ||
      `RapidX ${skillName.replace(/-/g, ' ')} skill for structured engineering workflows.`;

    // Kiro SKILL.md: name must match folder name, max 64 chars
    const safeName = skillName.slice(0, 64);
    const safeDesc = description.slice(0, 1024);

    const kiroSkillMd = `---
name: ${safeName}
description: ${safeDesc}
metadata:
  author: RapidX Agentic Engineering Platform
  source: rapidx-platform
---

${skillBody}
`;
    fs.writeFileSync(path.join(destSkillDir, 'SKILL.md'), kiroSkillMd, 'utf8');

    // Copy scripts/ and references/ sub-directories if they exist
    for (const subDir of ['scripts', 'references', 'assets']) {
      const srcSub = path.join(TEMPLATES_DIR, 'skills', skillName, subDir);
      if (fs.existsSync(srcSub)) {
        const destSub = path.join(destSkillDir, subDir);
        fs.mkdirSync(destSub, { recursive: true });
        for (const f of fs.readdirSync(srcSub)) {
          fs.copyFileSync(path.join(srcSub, f), path.join(destSub, f));
        }
      }
    }
  }
}

/**
 * Install RapidX agents as Kiro powers in .kiro/powers/.
 * Each power gets a POWER.md and optional steering/ files.
 */
function installKiroPowers(kiroPowersDir, components) {
  fs.mkdirSync(kiroPowersDir, { recursive: true });
  const agents = components ? Array.from(components.agents) : Object.keys(POWER_DEFINITIONS);
  const toInstall = agents.filter(a => POWER_DEFINITIONS[a]);

  for (const agentName of toInstall) {
    const def = POWER_DEFINITIONS[agentName];
    const powerName = `rapidx-${agentName}`;
    const powerDir = path.join(kiroPowersDir, powerName);
    fs.mkdirSync(powerDir, { recursive: true });

    const keywordsYaml = def.keywords.map(k => `  - ${k}`).join('\n');

    const powerMd = `---
name: ${powerName}
displayName: ${def.displayName}
description: ${def.description}
keywords:
${keywordsYaml}
---

## ${def.displayName}

${def.description}

### Activation

This power activates automatically when your request involves: ${def.keywords.slice(0, 4).join(', ')}.

You can also invoke it manually using the \`/${powerName}\` command in Kiro chat.

### Onboarding

1. Verify the project has a \`.rapidx/stack.json\` (run \`rapidx install\` if not)
2. Check that relevant skills are installed in \`.kiro/skills/\`
3. Reference \`AGENTS.md\` at the project root for the full agent roster

### Workflow

${def.steeringFiles.length > 0
    ? `See \`steering/${def.steeringFiles[0]}\` for the detailed workflow.`
    : `Delegate to this agent by describing your task in natural language. The agent will apply RapidX methodology and your project's tech stack context automatically.`}
`;

    fs.writeFileSync(path.join(powerDir, 'POWER.md'), powerMd, 'utf8');

    // Write steering files
    if (def.steeringFiles.length > 0) {
      const steeringDir = path.join(powerDir, 'steering');
      fs.mkdirSync(steeringDir, { recursive: true });
      for (const steeringFile of def.steeringFiles) {
        const content = POWER_STEERING_CONTENT[steeringFile];
        if (content) {
          fs.writeFileSync(path.join(steeringDir, steeringFile), content, 'utf8');
        }
      }
    }
  }
}

/**
 * Install steering files in .kiro/steering/ for always-on project context.
 */
function installKiroSteering(kiroSteeringDir, profile, stack, components) {
  fs.mkdirSync(kiroSteeringDir, { recursive: true });

  // Tech stack context — always active
  const techStackContent = generateTechStackSteering(profile, stack);
  fs.writeFileSync(
    path.join(kiroSteeringDir, 'tech-stack.md'),
    techStackContent,
    'utf8'
  );

  // Coding standards — always active, derived from selected rules
  const codingStdContent = generateCodingStandardsSteering(stack);
  fs.writeFileSync(
    path.join(kiroSteeringDir, 'coding-standards.md'),
    codingStdContent,
    'utf8'
  );

  // Security baseline — always active
  const securityContent = `# Security Baseline

> Always enforce these security practices in this workspace.

## Required Checks

- Validate and sanitise ALL user-supplied input before use
- Encode output before rendering to prevent XSS
- Use parameterised queries — never string-interpolate SQL
- Secrets go in environment variables, never in source code
- Review dependencies for known CVEs before adding them
- Enforce authentication and authorisation on every endpoint
- Use HTTPS everywhere; never transmit sensitive data over HTTP

## Sensitive Areas

Automatically activate the \`security-review\` skill when touching:
- Authentication and session management
- Payment processing
- Personal or financial data
- File uploads and downloads
- External API integrations
- Admin or privileged endpoints
`;
  fs.writeFileSync(path.join(kiroSteeringDir, 'security.md'), securityContent, 'utf8');

  // Skills roster — auto-disclosed reference
  if (components && components.skills.size > 0) {
    const skillsList = Array.from(components.skills).map(s => {
      const desc = SKILL_DESCRIPTIONS[s] || s;
      return `- **${s}**: ${desc}`;
    }).join('\n');

    const skillsRoster = `# Installed Skills

> Reference: skills available in this workspace's \`.kiro/skills/\` directory.

${skillsList}

## Usage

Skills activate automatically when your request matches their description.
Type \`/\` in the Kiro chat input to see all available skills as slash commands.
`;
    fs.writeFileSync(path.join(kiroSteeringDir, 'skills-roster.md'), skillsRoster, 'utf8');
  }
}

/**
 * Install hook scripts for Kiro's event system in .kiro/hooks/.
 */
function installKiroHooks(kiroHooksDir, components) {
  fs.mkdirSync(kiroHooksDir, { recursive: true });

  const hooks = components ? Array.from(components.hooks) : ['session-start', 'audit-trail', 'secret-scanner'];

  // Copy RapidX hook scripts that exist in templates
  const hooksSrc = path.join(TEMPLATES_DIR, 'hooks', 'rapidx');
  if (fs.existsSync(hooksSrc)) {
    for (const f of fs.readdirSync(hooksSrc)) {
      const hookName = f.replace(/\.(js|sh)$/, '');
      if (hooks.includes(hookName)) {
        fs.copyFileSync(path.join(hooksSrc, f), path.join(kiroHooksDir, f));
      }
    }
  }

  // Write a hooks manifest so Kiro knows which hooks are active
  const manifest = {
    generated_by: 'rapidx-platform',
    hooks: hooks.map(h => ({
      name: h,
      script: `.rapidx/hooks/${h}.js`,
      trigger: h === 'session-start' ? 'onOpen'
        : h === 'session-end' ? 'onClose'
          : h === 'audit-trail' ? 'onSave'
            : h === 'secret-scanner' ? 'onSave'
              : 'onSave',
    })),
  };
  fs.writeFileSync(path.join(kiroHooksDir, 'rapidx-hooks.json'), JSON.stringify(manifest, null, 2), 'utf8');
}

/**
 * Install Get Things Done workflow commands as Kiro slash commands.
 * Kiro supports slash commands via skill activation — we write lightweight
 * skills that proxy to the GTD command descriptions.
 */
function installKiroCommands(kiroSkillsDir) {
  const gtdSrc = path.join(GTD_DIR, 'commands', 'gtd');
  const rapidxSrc = path.join(TEMPLATES_DIR, 'commands', 'rapidx');

  // Generate command index for both GTD and RapidX commands
  const commandSources = [
    { src: gtdSrc, prefix: 'rapidx' },
    { src: rapidxSrc, prefix: 'rapidx' },
  ];

  let totalGenerated = 0;

  for (const { src, prefix } of commandSources) {
    if (!fs.existsSync(src)) continue;

    const commandFiles = fs.readdirSync(src).filter(f => f.endsWith('.md'));
    for (const cmdFile of commandFiles) {
      const cmdName = `${prefix}-${cmdFile.replace('.md', '')}`;
      const raw = fs.readFileSync(path.join(src, cmdFile), 'utf8');

      // Extract the description line (first non-heading, non-empty line)
      const descLine = raw.split('\n').find(l => l.trim() && !l.startsWith('#')) || cmdName;
      const description = descLine.replace(/[*_`]/g, '').trim().slice(0, 1024);

      const cmdSkillDir = path.join(kiroSkillsDir, cmdName);
      fs.mkdirSync(cmdSkillDir, { recursive: true });

      const skillMd = `---
name: ${cmdName.slice(0, 64)}
description: ${description}
metadata:
  type: command
  source: rapidx-platform
  command: /${prefix}:${cmdFile.replace('.md', '')}
---

${raw}
`;
      fs.writeFileSync(path.join(cmdSkillDir, 'SKILL.md'), skillMd, 'utf8');
      totalGenerated++;
    }
  }

  return totalGenerated;
}

/**
 * Install RapidX for Kiro IDE.
 *
 * Directory layout:
 * .kiro/
 *   skills/          — RapidX skills in Kiro SKILL.md format (workspace scope)
 *   powers/          — RapidX agents as Kiro powers with POWER.md + steering/
 *   steering/        — Always-on project context (tech stack, coding standards, security)
 *   hooks/           — Event-triggered hook scripts and manifest
 *
 * AGENTS.md          — Cross-tool agent roster at project root
 *
 * @param {object} options
 * @param {string} options.targetDir
 * @param {object} options.profile
 * @param {object} options.stack
 * @param {object} options.components - { rules: Set, skills: Set, agents: Set, hooks: Set }
 */
function installKiro(options) {
  const { targetDir, profile, stack, components } = options;

  const kiroDir = path.join(targetDir, '.kiro');
  const kiroSkillsDir = path.join(kiroDir, 'skills');
  const kiroPowersDir = path.join(kiroDir, 'powers');
  const kiroSteeringDir = path.join(kiroDir, 'steering');
  const kiroHooksDir = path.join(kiroDir, 'hooks');

  fs.mkdirSync(kiroDir, { recursive: true });

  // 1. Install skills in Kiro's SKILL.md format
  installKiroSkills(kiroSkillsDir, components);
  process.stdout.write(`  [RapidX] Installed ${components ? components.skills.size : 0} skills in .kiro/skills/\n`);

  // 2. Install agents as Kiro powers
  installKiroPowers(kiroPowersDir, components);
  const powerCount = components
    ? Array.from(components.agents).filter(a => POWER_DEFINITIONS[a]).length
    : Object.keys(POWER_DEFINITIONS).length;
  process.stdout.write(`  [RapidX] Installed ${powerCount} agent powers in .kiro/powers/\n`);

  // 3. Install always-on steering files
  installKiroSteering(kiroSteeringDir, profile, stack, components);
  process.stdout.write(`  [RapidX] Installed steering context in .kiro/steering/\n`);

  // 4. Install hook scripts
  installKiroHooks(kiroHooksDir, components);

  // 5. Install GTD + RapidX commands as Kiro skills
  const cmdCount = installKiroCommands(kiroSkillsDir);
  if (cmdCount > 0) {
    process.stdout.write(`  [RapidX] Installed ${cmdCount} Get Things Done commands as Kiro skills\n`);
  }

  // 6. Write AGENTS.md at project root for cross-tool compatibility
  const agentsMd = generateAgentsMd(profile, stack, components);
  fs.writeFileSync(path.join(targetDir, 'AGENTS.md'), agentsMd, 'utf8');

  return { success: true };
}

module.exports = { installKiro };
