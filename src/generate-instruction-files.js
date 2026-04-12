'use strict';
/**
 * generate-instruction-files.js
 *
 * Generates pattern-based instruction files for VS Code Copilot
 * (inspired by github/awesome-copilot instruction format).
 *
 * Instruction files use glob patterns to apply automatically when
 * Copilot is working on matching file types — no manual context needed.
 *
 * Output: .github/copilot/ directory with *.instructions.md files
 */

const fs = require('fs');
const path = require('path');

/**
 * Generate all instruction files for VS Code + GitHub Copilot
 * based on the project's tech stack.
 *
 * @param {object} stackConfig - .rapidx/stack.json contents
 * @param {object} profile - active client profile
 * @param {string} targetDir - target root directory
 * @param {object} knowledge - .rapidx/knowledge/ contents (optional)
 */
function generateInstructionFiles(stackConfig, profile, targetDir, knowledge = {}) {
  const copilotDir = path.join(targetDir, '.github', 'copilot');
  fs.mkdirSync(copilotDir, { recursive: true });

  const files = [];

  // Always-generated instruction files
  files.push(...generateCoreInstructions(stackConfig, profile, knowledge));

  // Stack-conditional instruction files
  if (stackConfig.frontend?.framework) {
    files.push(...generateFrontendInstructions(stackConfig));
  }
  if (stackConfig.backend?.language) {
    files.push(...generateBackendInstructions(stackConfig));
  }
  if (stackConfig.database?.primary) {
    files.push(...generateDatabaseInstructions(stackConfig));
  }
  if (stackConfig.testing) {
    files.push(...generateTestingInstructions(stackConfig));
  }
  if (stackConfig.infrastructure?.cicd?.length > 0) {
    files.push(...generateCICDInstructions(stackConfig));
  }

  // Write all files
  for (const { filename, content } of files) {
    const filePath = path.join(copilotDir, filename);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
  }

  return files.map(f => path.join('.github', 'copilot', f.filename));
}

// ─── Core instructions ────────────────────────────────────────────────────────

function generateCoreInstructions(stackConfig, profile, knowledge) {
  const techLine = buildTechLine(stackConfig);
  const knowledgeBlock = knowledge.codePatterns
    ? `\n## Project-Specific Patterns (Auto-learned)\n\n${knowledge.codePatterns}`
    : '';

  return [
    {
      filename: 'general.instructions.md',
      content: `---
applyTo: "**"
---

# General Coding Instructions — RapidX Platform

## Tech Stack

${techLine}

## Core Principles

- Follow the Spec-Driven Development (SDD) workflow: spec → review → plan → tasks → implement → verify
- Check \`specs/\` for active feature specifications before starting any new feature
- Read \`.rapidx/CONSTITUTION.md\` for non-negotiable project principles
- Check \`.rapidx/knowledge/\` for learned codebase patterns and architecture context

## Coding Standards

- Use the naming conventions documented in \`.rapidx/knowledge/code-patterns.md\`
- Write tests BEFORE implementation (TDD)
- All new endpoints/functions need corresponding tests
- No hardcoded secrets or credentials — use environment variables
- Input validation at all system boundaries (user input, external APIs)

## Version Constraints

${buildVersionConstraints(stackConfig)}

## Architecture Compliance

- Read \`ARCHITECTURE.md\` before adding new components
- Check \`docs/adr/\` for accepted architecture decisions
- Do not introduce patterns that contradict accepted ADRs

## Workflow Commands

| Task | Command |
|------|---------|
| New feature spec | \`/rapidx:spec [feature]\` |
| Review spec | \`/rapidx:spec-review [id]\` |
| Generate plan | \`/rapidx:plan-spec [id]\` |
| Execute tasks | \`/rapidx:execute-phase\` |
| Verify work | \`/rapidx:verify-work\` |
| Learn from codebase | \`/rapidx:learn\` |
| Check governance | \`/rapidx:governance-check\` |
${knowledgeBlock}
`,
    },
    {
      filename: 'security.instructions.md',
      content: `---
applyTo: "**"
---

# Security Instructions — RapidX Platform

## Security Principles (Always Apply)

1. **No hardcoded secrets** — All credentials, API keys, tokens must be in environment variables
2. **Input validation** — Validate and sanitize ALL user input before use
3. **Authentication** — Every protected endpoint must verify authentication
4. **Authorization** — Check permissions AFTER authentication
5. **SQL injection** — Use parameterized queries / ORM methods only, never string concatenation
6. **XSS prevention** — Escape all user-generated content in HTML contexts
7. **CSRF protection** — Include CSRF tokens on state-changing requests
8. **Error messages** — Do not leak internal details in error responses

## Tech Stack Security

${buildStackSecurityGuidance(stackConfig)}

## Secret Detection

Before committing, verify no secrets exist:
\`\`\`bash
grep -rn "password\\|secret\\|api_key\\|token" --include="*.ts" --include="*.js" --include="*.py" .
\`\`\`

## Dependencies

- Review new dependencies before adding (check for known vulnerabilities)
- Run \`npm audit\` / \`pip audit\` / \`govulncheck\` regularly
- Pin dependency versions — no \`*\` or \`latest\` in production dependencies
`,
    },
    {
      filename: 'agents.instructions.md',
      content: `---
applyTo: "**"
---

# Available RapidX Agents

These specialized agents are available in this project. Invoke them for specific tasks:

## SDLC Workflow Agents

| Agent | Purpose | Invoke when |
|-------|---------|-------------|
| **spec-writer** | Creates feature specifications | Starting any new feature |
| **workflow-orchestrator** | Drives the full SDLC | Need end-to-end workflow guidance |
| **planner** | Generates project plans | Planning a new project or phase |
| **architect** | Architecture guidance | Making structural decisions |

## Quality Agents

| Agent | Purpose | Invoke when |
|-------|---------|-------------|
| **code-reviewer** | Reviews code changes | Before committing or PR |
| **security-reviewer** | Security analysis | Adding auth, APIs, data handling |
| **tdd-guide** | TDD workflow guidance | Writing tests |
| **e2e-runner** | E2E test generation | Adding user-facing features |

## Knowledge Agents

| Agent | Purpose | Invoke when |
|-------|---------|-------------|
| **knowledge-curator** | Learns from codebase | After significant changes |
| **adr-writer** | Creates architecture decisions | Making architectural choices |
| **doc-updater** | Updates documentation | After feature implementation |

## Support Agents

| Agent | Purpose | Invoke when |
|-------|---------|-------------|
| **build-error-resolver** | Fixes build errors | Build or compile fails |
| **refactor-cleaner** | Code refactoring | Cleaning up existing code |
| **database-reviewer** | Database design review | Schema changes or new queries |

## Get Things Done Workflow

\`\`\`
1. /rapidx:spec [feature]        → spec-writer creates specification
2. /rapidx:spec-review [id]      → spec-writer validates the spec
3. /rapidx:plan-spec [id]        → planner + architect create plan
4. /rapidx:tasks-from-spec [id]  → planner creates GTD tasks
5. /rapidx:execute-phase         → workflow-orchestrator executes
6. /rapidx:verify-work           → code-reviewer + security-reviewer verify
7. /rapidx:review                → code-reviewer does PR review
8. /rapidx:ship                  → doc-updater + release prep
\`\`\`
`,
    },
  ];
}

// ─── Frontend instructions ────────────────────────────────────────────────────

function generateFrontendInstructions(stackConfig) {
  const { framework, version, ui_library, state_management } = stackConfig.frontend || {};
  if (!framework) return [];

  const frameworkPatterns = {
    react: {
      globs: ['**/*.tsx', '**/*.jsx', '**/*.tsx'],
      guidance: `## React ${version || ''} Patterns

- Use functional components with hooks — no class components
- ${parseFloat(version) >= 18 ? 'Use React 18 concurrent features (useTransition, useDeferredValue) where appropriate' : ''}
- ${parseFloat(version) < 19 ? 'Do NOT use React 19 features (Actions, use() hook) — not available in this stack' : ''}
- Custom hooks in \`hooks/\` directory, prefixed with \`use\`
- Component files: PascalCase.tsx
- Co-locate tests: Component.test.tsx alongside Component.tsx`,
    },
    nextjs: {
      globs: ['**/*.tsx', '**/*.jsx', 'app/**/*', 'pages/**/*'],
      guidance: `## Next.js ${version || ''} Patterns

- ${parseFloat(version) >= 13 ? 'Use App Router (/app directory) — not Pages Router' : 'Use Pages Router (/pages directory)'}
- Server Components by default, Client Components only when needed (interactivity, browser APIs)
- API Routes: \`app/api/\` or \`pages/api/\`
- Use Next.js Image, Link, and Font optimization components
- Environment variables: \`NEXT_PUBLIC_\` prefix for client-side vars`,
    },
    angular: {
      globs: ['**/*.ts', '**/*.html', 'src/app/**/*'],
      guidance: `## Angular ${version || ''} Patterns

- Use standalone components (Angular 14+)
- Services for business logic, components for presentation only
- Use \`inject()\` function over constructor injection where possible
- Reactive forms over template-driven for complex forms
- OnPush change detection strategy for performance`,
    },
    vue: {
      globs: ['**/*.vue', '**/*.ts'],
      guidance: `## Vue ${version || ''} Patterns

- Use Composition API (\`setup()\`) — not Options API
- \`<script setup>\` syntax preferred
- Composables in \`composables/\` directory, prefixed with \`use\`
- Component files: PascalCase.vue`,
    },
  };

  const patterns = frameworkPatterns[framework.toLowerCase()] || {
    globs: ['**/*.ts', '**/*.js'],
    guidance: `## ${framework} ${version || ''} Patterns\n\nFollow project conventions in \`.rapidx/knowledge/code-patterns.md\``,
  };

  const uiGuidance = buildUILibraryGuidance(ui_library);
  const stateGuidance = buildStateManagementGuidance(state_management);

  return [{
    filename: `frontend-${framework.toLowerCase()}.instructions.md`,
    content: `---
applyTo: "${patterns.globs.join(',')}"
---

# Frontend Instructions — ${framework} ${version || ''}

${patterns.guidance}

${uiGuidance}

${stateGuidance}

## Component Structure

\`\`\`
components/
├── ui/              # Reusable UI primitives
├── features/        # Feature-specific components
└── layouts/         # Page layout components
\`\`\`

## Testing

- Unit: Test component logic with Vitest/Jest
- Integration: Test component interactions
- E2E: Test user journeys with Playwright/Cypress for P1 features
`,
  }];
}

// ─── Backend instructions ─────────────────────────────────────────────────────

function generateBackendInstructions(stackConfig) {
  const { language, framework, runtime_version, framework_version, api_style } = stackConfig.backend || {};
  if (!language) return [];

  const languageGlobs = {
    typescript: ['**/*.ts', '!**/*.d.ts', '!**/*.test.ts'],
    javascript: ['**/*.js', '!**/*.test.js'],
    python: ['**/*.py', '!**/test_*.py', '!**/*_test.py'],
    go: ['**/*.go', '!**/*_test.go'],
    java: ['**/*.java'],
    csharp: ['**/*.cs'],
  };

  const globs = languageGlobs[language.toLowerCase()] || ['**/*'];

  return [{
    filename: `backend-${language.toLowerCase()}.instructions.md`,
    content: `---
applyTo: "${globs.join(',')}"
---

# Backend Instructions — ${language} ${framework ? `/ ${framework}` : ''} ${framework_version || ''}

## Version Constraints

- Runtime: ${runtime_version || 'see .rapidx/stack.json'}
- Framework: ${framework_version || 'see .rapidx/stack.json'}
- Use ONLY features available in these versions. Do NOT use features from newer versions.

## ${language} Patterns

${buildLanguagePatterns(language, framework, stackConfig)}

## API Design (${(api_style || ['rest']).join(', ')})

${buildAPIPatterns(api_style || ['rest'], stackConfig)}

## Error Handling

- Use typed error classes — never throw raw strings
- Log errors with structured logging (include correlation IDs)
- Return consistent error response format across all endpoints
- Do not leak internal error details to clients

## Security

- Validate all input at the controller/handler boundary
- Use the ORM/query builder — never raw SQL string concatenation
- Hash passwords with bcrypt/argon2 — never store plaintext
- Sanitize all user-provided data before database operations
`,
  }];
}

// ─── Database instructions ────────────────────────────────────────────────────

function generateDatabaseInstructions(stackConfig) {
  const { primary, primary_version, orm } = stackConfig.database || {};
  if (!primary) return [];

  return [{
    filename: 'database.instructions.md',
    content: `---
applyTo: "**/*.sql,**/migrations/**,**/models/**,**/schemas/**,**/db/**"
---

# Database Instructions — ${primary} ${primary_version || ''} ${orm ? `via ${orm}` : ''}

## Version: ${primary} ${primary_version || 'see .rapidx/stack.json'}

Use ONLY features available in ${primary} ${primary_version || 'the configured version'}.

## ${orm ? `ORM: ${orm}` : 'Query Patterns'}

${buildORMPatterns(primary, orm)}

## Migration Rules

- Every schema change needs a migration file
- Migrations must be reversible (up + down)
- Never modify existing migrations — always create new ones
- Test migrations on a copy of production data before deploying
- Name migrations: \`{timestamp}_{description}.{ext}\`

## Query Best Practices

- Use indexes for all WHERE and JOIN columns in frequent queries
- Avoid N+1 queries — use eager loading / joins
- Use transactions for multi-step operations
- Paginate large result sets — never fetch unbounded lists
- Use \`EXPLAIN ANALYZE\` for slow query investigation (${primary})

## Security

- Use parameterized queries ALWAYS — never string interpolation
- Principle of least privilege for DB user permissions
- Encrypt sensitive columns (PII, credentials)
`,
  }];
}

// ─── Testing instructions ─────────────────────────────────────────────────────

function generateTestingInstructions(stackConfig) {
  const testing = stackConfig.testing || {};
  const unitFrameworks = testing.unit || [];
  const e2eFrameworks = testing.e2e || [];

  return [{
    filename: 'testing.instructions.md',
    content: `---
applyTo: "**/*.test.ts,**/*.test.js,**/*.spec.ts,**/*.spec.js,**/test_*.py,**/*_test.go,**/*Test.java"
---

# Testing Instructions

## Framework Stack

- Unit/Integration: ${unitFrameworks.join(', ') || 'see .rapidx/stack.json'}
- E2E: ${e2eFrameworks.join(', ') || 'None configured'}

## TDD Workflow (mandatory for all new features)

1. Write a failing test that maps to a spec acceptance scenario
2. Run the test — verify it fails with the expected error
3. Write the minimum implementation to make the test pass
4. Refactor while keeping tests green
5. Repeat for next acceptance scenario

## Test Structure

\`\`\`
describe('[Component/Module Name]', () => {
  describe('[Method/Behavior]', () => {
    it('should [expected behavior] when [condition]', () => {
      // Arrange — set up test state
      // Act — call the unit under test
      // Assert — verify the outcome
    });
  });
});
\`\`\`

## Test Naming

- Unit tests: \`[thing].test.{ts,js}\` co-located with source
- Integration tests: \`[thing].integration.test.{ts,js}\` or \`tests/integration/\`
- E2E tests: \`[feature].e2e.spec.ts\` in \`e2e/\` or \`tests/e2e/\`

## What to test

- All public functions/methods
- All API endpoints (request validation, happy path, error cases)
- All acceptance scenarios from specs
- Edge cases: empty input, null, max values, concurrent access

## What NOT to mock

- The database — integration tests should hit a real test DB
- The file system — integration tests should use real temp files
- Only mock: external HTTP APIs, email services, time (for date-sensitive tests)

## Coverage targets

- Minimum: 80% line coverage
- P1 features: 100% of acceptance scenarios must have E2E tests

## E2E tests (${e2eFrameworks.join('/')} patterns)

${buildE2EPatterns(e2eFrameworks)}
`,
  }];
}

// ─── CI/CD instructions ───────────────────────────────────────────────────────

function generateCICDInstructions(stackConfig) {
  const cicd = stackConfig.infrastructure?.cicd || [];

  return [{
    filename: 'cicd.instructions.md',
    content: `---
applyTo: ".github/workflows/**,gitlab-ci.yml,.circleci/**,Jenkinsfile"
---

# CI/CD Instructions

## Platform: ${cicd.join(', ')}

## Pipeline Requirements

Every PR must pass:
1. Lint check
2. Type check (if TypeScript/statically typed)
3. Unit tests
4. Integration tests (against test DB)
5. Security scan (secret detection)
6. Build verification

E2E tests run on merge to main/develop.

## RapidX Governance Gates

The following RapidX checks are integrated into CI:
- \`rapidx-spec-check\` — Validates spec compliance for feature branches
- \`rapidx-governance\` — Runs governance audit for regulated profiles
- Secret scanner (pre-merge)

## Environment Variables in CI

- All secrets via CI platform secrets (never in YAML files)
- \`RAPIDX_PROFILE\` — active client profile
- \`RAPIDX_ENV\` — deployment environment

## Branch Strategy

Feature branches: \`{###-feature-slug}\` (matches specs directory)
Release branches: \`release/{version}\`
Hotfix branches: \`hotfix/{description}\`
`,
  }];
}

// ─── Helper builders ──────────────────────────────────────────────────────────

function buildTechLine(stackConfig) {
  const parts = [];
  if (stackConfig.frontend?.framework) parts.push(`${stackConfig.frontend.framework}@${stackConfig.frontend.version || 'latest'}`);
  if (stackConfig.backend?.language) parts.push(`${stackConfig.backend.language}@${stackConfig.backend.runtime_version || 'latest'}`);
  if (stackConfig.backend?.framework) parts.push(stackConfig.backend.framework);
  if (stackConfig.database?.primary) parts.push(`${stackConfig.database.primary}@${stackConfig.database.primary_version || 'latest'}`);
  if (stackConfig.database?.orm) parts.push(stackConfig.database.orm);
  return parts.length > 0 ? `**${parts.join(' · ')}**` : '_See .rapidx/stack.json_';
}

function buildVersionConstraints(stackConfig) {
  const constraints = [];
  if (stackConfig.frontend?.framework && stackConfig.frontend?.version) {
    constraints.push(`- ${stackConfig.frontend.framework}: use ${stackConfig.frontend.version} patterns only`);
  }
  if (stackConfig.backend?.runtime && stackConfig.backend?.runtime_version) {
    constraints.push(`- ${stackConfig.backend.runtime}: ${stackConfig.backend.runtime_version} APIs only`);
  }
  if (stackConfig.database?.primary && stackConfig.database?.primary_version) {
    constraints.push(`- ${stackConfig.database.primary}: ${stackConfig.database.primary_version} features only`);
  }
  return constraints.join('\n') || '- Check .rapidx/stack.json for version constraints';
}

function buildStackSecurityGuidance(stackConfig) {
  const parts = [];
  const lang = stackConfig.backend?.language?.toLowerCase();
  if (lang === 'typescript' || lang === 'javascript') {
    parts.push('- Use `helmet` for Express security headers');
    parts.push('- Use `zod` or `joi` for input validation schemas');
    parts.push('- Use `bcrypt`/`argon2` for password hashing');
  }
  if (lang === 'python') {
    parts.push('- Use `pydantic` for input validation');
    parts.push('- Use `passlib` for password hashing');
    parts.push('- Check for SQL injection with parameterized queries via SQLAlchemy');
  }
  if (lang === 'go') {
    parts.push('- Validate all inputs with explicit type assertions');
    parts.push('- Use `crypto/bcrypt` for password hashing');
    parts.push('- Use parameterized queries via database/sql or GORM');
  }
  return parts.join('\n') || '- Follow OWASP Top 10 for your tech stack';
}

function buildLanguagePatterns(language, framework, stackConfig) {
  const patterns = {
    typescript: `- Strict TypeScript: \`strict: true\` in tsconfig.json
- Prefer \`interface\` over \`type\` for object shapes (unless union/intersection needed)
- Use \`unknown\` over \`any\` — always narrow types explicitly
- Async/await over callbacks and raw Promises
- Use Zod or similar for runtime type validation at boundaries`,
    python: `- Type hints required for all function signatures
- Use \`dataclasses\` or Pydantic for data objects
- \`async def\` for I/O-bound operations
- Use context managers (\`with\`) for resource management
- f-strings for string formatting (not \`%\` or \`.format()\`)`,
    go: `- Return errors as values — never panic in library code
- Use \`context.Context\` as first parameter for all I/O functions
- Interfaces should be small (1-3 methods) and defined at the consumer
- Use \`defer\` for resource cleanup
- Capitalize exported identifiers, lowercase unexported`,
    java: `- Use records for data classes (Java 16+)
- Prefer \`Optional<T>\` over nullable returns
- Use \`var\` for local type inference where clear
- Stream API for collection transformations
- \`@Validated\` for Spring request validation`,
  };
  return patterns[language.toLowerCase()] || `Follow conventions in \`.rapidx/knowledge/code-patterns.md\``;
}

function buildAPIPatterns(apiStyles, stackConfig) {
  if (apiStyles.includes('rest')) {
    return `- Use HTTP methods semantically: GET (read), POST (create), PUT (replace), PATCH (update), DELETE (remove)
- Return appropriate HTTP status codes (200, 201, 400, 401, 403, 404, 409, 500)
- Consistent error response format: \`{ error: { code, message, details } }\`
- Paginate list endpoints: \`{ data: [...], pagination: { page, pageSize, total } }\`
- Version the API: \`/api/v1/\``;
  }
  if (apiStyles.includes('graphql')) {
    return `- Define schema types before resolvers
- Use DataLoader for batching and N+1 prevention
- Implement cursor-based pagination for lists
- Use input types for mutations (not inline args)
- Return \`errors\` array on partial failures`;
  }
  return '- Follow API design guidelines in `.rapidx/knowledge/`';
}

function buildORMPatterns(db, orm) {
  const patterns = {
    prisma: `- Schema in \`prisma/schema.prisma\` — single source of truth
- Run \`prisma migrate dev\` for development migrations
- Use \`prisma generate\` after schema changes
- Type-safe queries via generated Prisma Client
- Transactions via \`prisma.$transaction()\``,
    drizzle: `- Schema definitions in \`src/db/schema.ts\`
- Use Drizzle ORM's query builder — no raw SQL
- Migrations via \`drizzle-kit generate\`
- Type-safe queries automatically`,
    sqlalchemy: `- Use declarative base models
- Session management: always close sessions
- Use \`relationship()\` for associations
- Alembic for migrations: \`alembic revision --autogenerate\``,
    gorm: `- Struct tags for field configuration
- Use \`gorm.Model\` for standard fields (ID, CreatedAt, etc.)
- Transactions via \`db.Transaction(func(tx *gorm.DB) error {...})\`
- Auto-migrate carefully in production`,
  };
  return patterns[orm?.toLowerCase()] || `Follow ${db} best practices with your ORM/query layer`;
}

function buildUILibraryGuidance(uiLibrary) {
  if (!uiLibrary || uiLibrary.length === 0) return '';
  const lib = Array.isArray(uiLibrary) ? uiLibrary[0] : uiLibrary;
  const guidance = {
    tailwind: '## Tailwind CSS\n- Use utility classes — no custom CSS unless unavoidable\n- Extract repeating patterns to components, not custom CSS\n- Use `cn()` helper for conditional classes',
    shadcn: '## shadcn/ui\n- Import from `@/components/ui/` — never modify shadcn source files\n- Compose shadcn primitives for complex UI\n- Use `cn()` from `@/lib/utils` for className merging',
    mui: '## Material UI\n- Use `sx` prop for component-scoped styles\n- Theme customization via `createTheme()` — no inline `style` props\n- Use MUI Grid/Stack for layout',
  };
  return guidance[lib.toLowerCase()] || '';
}

function buildStateManagementGuidance(stateMgmt) {
  if (!stateMgmt || stateMgmt.length === 0) return '';
  const lib = Array.isArray(stateMgmt) ? stateMgmt[0] : stateMgmt;
  const guidance = {
    zustand: '## Zustand\n- One store per feature domain\n- Stores in `src/stores/`\n- Actions co-located in the store definition\n- Use `immer` middleware for complex state',
    redux: '## Redux/RTK\n- Use Redux Toolkit — no bare Redux\n- Slices for feature state\n- RTK Query for server state — not custom thunks\n- Selectors for derived state',
  };
  return guidance[lib.toLowerCase()] || '';
}

function buildE2EPatterns(frameworks) {
  if (frameworks.includes('playwright')) {
    return `- Page Object Model pattern for complex pages
- Tests in \`e2e/\` or \`tests/e2e/\`
- Use \`@playwright/test\` \`expect\` assertions
- Locators: use \`getByRole\`, \`getByLabel\` (semantic) over CSS selectors
- Parallel test execution enabled by default`;
  }
  if (frameworks.includes('cypress')) {
    return `- Commands in \`cypress/support/commands.ts\`
- Custom commands for authentication setup
- \`cy.intercept()\` for API mocking in E2E tests
- Visual regression via \`cypress-visual-regression\``;
  }
  return '- Follow E2E testing patterns in `.rapidx/knowledge/code-patterns.md`';
}

module.exports = { generateInstructionFiles };
