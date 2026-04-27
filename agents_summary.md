# RapidX — Agents & Skills Summary

> **RapidX Agentic Engineering Platform v2.0.0**
> A unified enterprise-grade SDLC orchestration framework for AI-assisted software delivery.

---

## Agents

Agents are specialised AI subagents that perform discrete roles during planning, development, review, testing, and governance. They are activated automatically based on task type and the project's configured tech stack — only relevant agents are loaded into context.

The 10 core Get Things Done agents are available across **Claude Code, VS Code + GitHub Copilot, and Cursor**. Each agent file is augmented at install time with an `## Active skills` section that references only the skills installed for your tech stack (see [Agent × Skill relationships](#agent--skill-relationships) below).

### How to invoke agents by IDE

| IDE | Pattern | Example |
|-----|---------|---------|
| **Claude Code** | Built-in subagent delegation | Described in CLAUDE.md / AGENTS.md |
| **VS Code + Copilot Chat** | Attach with `#file:` | `#file:.github/copilot/agents/rapidx-code-reviewer.md` |
| **Cursor Composer** | Reference with `@` | `@.cursor/agents/rapidx-code-reviewer.md` |

---

---

### Core Agents — Always Active

These agents are present in every project regardless of tech stack.

| Agent | Role |
|-------|------|
| **Planner** | Translates project goals into structured requirements, roadmaps, and phase plans. Produces phased task breakdowns with acceptance criteria, dependency mapping, and risk identification. Adapts plans to the configured tech stack and version constraints. |
| **Architect** | Handles system design, component architecture, API contract definition, and technology decisions. Produces Architecture Decision Records (ADRs). Enforces version-constrained design — only designs with APIs available in the configured stack versions. |
| **TDD Guide** | Writes failing tests before any implementation code, then guides the minimum implementation to make them pass, then refactors. Enforces "never write implementation before the test." Uses the project's configured testing framework (Jest/Vitest, pytest, Go testing, JUnit) from the stack config. |
| **Code Reviewer** | Performs code reviews against a 4-category checklist: quality (readability, function size, magic numbers, error handling), standards (naming, file organisation, active rules), correctness (logic, edge cases, null handling, async/await), and tests (presence, meaningfulness, clarity). Works alongside language-specific specialist reviewers when available. |
| **Security Reviewer** | Performs security-focused reviews triggered whenever code touches authentication, authorisation, user input, file uploads, payment processing, database queries with user-supplied data, API endpoint creation, secrets handling, or cross-origin requests. Reviews against secrets management, input validation, authentication, API security, and data protection checklists. |
| **Build Error Resolver** | Diagnoses build errors, compilation failures, type errors, and CI/CD pipeline failures using a 6-step systematic process: read the full error, categorise it, locate the source, check version compatibility against stack config, propose the minimal fix, verify the fix introduces no new errors. Covers TypeScript, Python, Go, and CI/CD failure categories. |
| **Doc Updater** | Keeps documentation in sync with code changes. Triggered after features or significant refactors that change public APIs, configuration options, installation procedures, or system design. Updates README, inline comments, API docs (OpenAPI/Swagger), CHANGELOG, and architecture docs. Documents the "why" not the "what" — removes outdated documentation proactively. |

---

### Frontend Agents — Active when a frontend framework is in the stack

| Agent | Triggered by | Role |
|-------|-------------|------|
| **E2E Runner** | React, Next.js, Angular, Vue, Svelte, Blazor, React Native, Flutter, Playwright, Cypress | Writes and runs end-to-end tests using the E2E framework configured in the stack (Playwright or Cypress). Tests user flows, not implementation details. Uses accessible selectors (role, label, text) over CSS selectors. Ensures each test is deterministic, independent, and sets up its own state. Debugs test failures. |
| **Refactor Cleaner** | React, Next.js, Angular, Vue, Svelte | Improves code quality through targeted refactoring while always preserving existing behaviour. Applies patterns: extract function (long methods), extract variable (magic numbers/strings), extract interface (implicit types), remove dead code, flatten callbacks (callback hell → async/await), reduce nesting (early returns, guard clauses). Will not refactor when no tests exist to verify behaviour, when a deadline is imminent, or when code is scheduled for deletion. |

---

### Backend Language Agents — Active when the matching language is in the stack

| Agent | Triggered by | Role |
|-------|-------------|------|
| **C# / .NET Reviewer** | C#, ASP.NET Core, .NET, Blazor, MAUI | Specialist reviewer for C# codebases. Checks async/await correctness (flags `.Result`/`.Wait()`, `async void`, missing `CancellationToken`), EF Core N+1 patterns and missing `AsNoTracking()`, DI lifetime mismatches (scoped into singleton), missing `IHttpClientFactory` usage, nullable reference warnings, security headers, `[Authorize]`/`[AllowAnonymous]` coverage, and model binding hygiene. |
| **Python Reviewer** | Python (FastAPI, Django, Flask) | Specialist reviewer for Python codebases. Checks Pythonic idioms, type annotations, async patterns, and Python-specific security concerns. |
| **Go Reviewer** | Go | Specialist reviewer for Go codebases. Checks error handling conventions (`fmt.Errorf` wrapping, no ignored errors), goroutine lifecycle and leak prevention, interface design, and Go-specific performance patterns. |
| **Go Build Resolver** | Go | Diagnoses Go-specific build and module errors: missing imports, version conflicts in `go.mod`, CGO issues, interface implementation gaps. Runs `go mod tidy` analysis. |

---

### Database Agent — Active when any database is in the stack

| Agent | Triggered by | Role |
|-------|-------------|------|
| **Database Reviewer** | PostgreSQL, MySQL, MongoDB, DynamoDB, SQL Server, SQLite, MariaDB | Reviews database schema changes, migrations, query patterns, and ORM usage for correctness, performance, and safety. Checks migration reversibility, zero-downtime patterns for large table changes, N+1 queries, index appropriateness, parameterised queries, and transaction boundaries. ORM-aware: applies Prisma (`select` field limiting), SQLAlchemy (lazy loading caution), and JPA/Hibernate (`@BatchSize`, fetch joins) specific guidance based on the configured ORM from the stack. |

---

### RapidX Enterprise Agents — Always Active

These agents handle governance, compliance, and client management concerns.

| Agent | Role |
|-------|------|
| **Governance Auditor** | Audits the project against the active client profile's governance requirements across 5 areas: code quality (rule adherence), security (secret scanning, access controls, audit logging), review gates (mandatory checkpoint completion), audit trail (completeness of `.rapidx/audit/` logs), and component currency (installed skills/rules up to date). Produces a structured report with pass/fail per control, evidence references, and remediation recommendations. Runs compliance-specific audits for pharma (21 CFR Part 11), financial services (SOX), and insurance (HIPAA) profiles. Invoke with `/rapidx:governance-check` in Claude Code, or attach the agent file in Copilot/Cursor. |
| **Migration Analyst** | Analyses legacy codebases and produces migration strategies for modernisation engagements. Runs a 5-step process: codebase mapping, dependency audit, technical debt assessment, migration complexity scoring (1–5 scale), and strategy recommendation (strangler fig / big bang / branch by abstraction). Produces a structured Migration Analysis Report with executive summary, component inventory with risk ratings, recommended migration sequence, and risks/mitigations. |
| **Compliance Checker** | Verifies code against the regulatory compliance requirements in the active profile. Produces a structured pass/fail compliance check table with control ID, description, status, and evidence references. Covers 21 CFR Part 11 (audit trail, e-signatures, access controls, data integrity, computer validation), SOX IT Controls (change management, access management, operations, backup/recovery), and HIPAA Technical Safeguards (access controls, audit controls, integrity controls, transmission security). |
| **Client Onboarder** | Guides onboarding of new client engagements through a 6-step workflow: discovery (industry, size, tech stack, compliance requirements), profile selection, stack detection, component installation, documentation generation, and team briefing. Asks structured context questions to configure the right profile. Produces specific handoff deliverables: `.rapidx/stack.json`, `CLAUDE.md`, `AGENTS.md`, `.github/copilot-instructions.md`, and an onboarding summary for the engineering team. |

---

### SDD & Knowledge Agents — Active when SDD or Knowledge plugins are installed

| Agent | Role |
|-------|------|
| **Spec Writer** | Creates structured feature specifications following the SDD template (Problem Statement, User Scenarios with Given/When/Then acceptance criteria, Technical Design, NFRs, Constitution Check, Open Questions). Version-aware: designs against the project's actual stack versions from `stack.json`. Produces specs in `specs/{###-feature-slug}/spec.md`. |
| **ADR Writer** | Creates and manages Architecture Decision Records at `docs/adr/`. Handles numbering, slug generation, and index updates automatically. Integrates with the knowledge system — accepted ADRs become enforcement rules, deprecated ADRs become anti-patterns in `anti-patterns.md`. |
| **Knowledge Curator** | Extracts and maintains codebase knowledge in `.rapidx/knowledge/`. Processes source code (naming conventions, API patterns, error handling), architecture documents, linting rules, domain documentation, and user-provided inputs from `.rapidx/inputs/`. Produces `code-patterns.md`, `architecture.md`, `guidelines.md`, `domain.md`, and `anti-patterns.md`. Invoked via `/rapidx:learn` or `node scripts/learn-codebase.js`. |
| **Workflow Orchestrator** | Coordinates multi-agent SDLC workflows across platforms. Manages phase transitions, delegates to specialist agents based on task type and tech stack, tracks progress via `.planning/`, and ensures governance gates are honoured before phase advancement. Invocable in VS Code Copilot Chat and Cursor Composer as a cross-platform workflow entry point. |

---

## Agent × Skill relationships

Each agent has a set of candidate skills it can use. At install time the installer filters this list to only the skills actually installed for your tech stack (`components.skills` from `mapComponents()`). The filtered list is appended directly into each agent file as an `## Active skills` section.

This means agents are pre-wired with exactly the right context for your project — a Go service gets `golang-patterns` injected, a Django project gets `django-patterns`, and neither sees irrelevant skills.

| Agent | Candidate skills (filtered to installed at install time) |
|-------|----------------------------------------------------------|
| **planner** | `strategic-compact`, `coding-standards`, `frontend-patterns`, `backend-patterns`, `api-design` |
| **architect** | `architecture-copilot`, `coding-standards`, `api-design`, `frontend-patterns`, `backend-patterns`, `postgres-patterns`, `docker-patterns`, `deployment-patterns` |
| **tdd-guide** | `tdd-workflow`, `coding-standards`, `e2e-testing`, `verification-loop`, `golang-testing`, `python-testing`, `django-tdd`, `springboot-tdd`, `laravel-tdd`, `dotnet-tdd`, `cpp-testing`, `swift-protocol-di-testing`, `perl-testing` |
| **code-reviewer** | `coding-standards`, `security-review`, `frontend-patterns`, `backend-patterns`, `golang-patterns`, `python-patterns`, `django-patterns`, `springboot-patterns`, `laravel-patterns`, `dotnet-patterns`, `cpp-coding-standards`, `java-coding-standards`, `perl-patterns`, `swift-actor-persistence` |
| **security-reviewer** | `security-review`, `ai-governance`, `django-security`, `springboot-security`, `laravel-security`, `dotnet-security`, `perl-security`, `swift-concurrency-6-2` |
| **build-error-resolver** | `coding-standards`, `verification-loop`, `golang-patterns`, `python-patterns`, `django-patterns`, `springboot-patterns`, `laravel-patterns`, `dotnet-patterns`, `cpp-coding-standards`, `java-coding-standards` |
| **doc-updater** | `coding-standards`, `api-design` |
| **e2e-runner** | `e2e-testing`, `verification-loop`, `frontend-patterns` |
| **refactor-cleaner** | `coding-standards`, `verification-loop`, `frontend-patterns`, `backend-patterns`, `golang-patterns`, `python-patterns`, `django-patterns`, `springboot-patterns`, `dotnet-patterns` |
| **database-reviewer** | `postgres-patterns`, `database-migrations`, `backend-patterns`, `jpa-patterns` |

> Source: `src/agent-skill-map.json` — `src/inject-agent-skills.js` performs the filtering and injection during installation.

---

## Skills

Skills are reusable prompt modules that provide domain-specific knowledge and patterns. They are injected into agent context selectively — only skills relevant to the project's tech stack are loaded. A React + TypeScript + PostgreSQL project loads ~18–20 skills; a Java + Spring Boot project loads a different set.

---

### Core Skills — Always Loaded

| Skill | Purpose |
|-------|---------|
| **coding-standards** | Coding quality principles (KISS, DRY, YAGNI, readability-first) with concrete TypeScript/JavaScript/React patterns and examples. Covers variable/function naming, immutability, error handling, async/await, type safety, React component structure, REST API conventions, file organisation, commenting discipline, and code smell detection. Note: examples are TS/JS/React biased (from ECC upstream) but the underlying principles apply universally. |
| **security-review** | Comprehensive 10-area security checklist with code patterns: secrets management (env vars, no hardcoded keys), input validation (schema-based with zod/pydantic), SQL injection prevention (parameterised queries), authentication/authorisation (httpOnly cookies, role checks), XSS prevention (sanitisation, CSP), CSRF protection (tokens, SameSite cookies), rate limiting (endpoint and user-based), sensitive data exposure (log redaction, generic error messages), dependency security (npm audit, lock files), plus a pre-deployment security checklist. Activated on auth, payment, input handling, API creation, secrets, and sensitive data work. |
| **tdd-workflow** | 7-step TDD workflow: write user journeys → generate test cases → run failing tests (red) → implement minimum code (green) → run tests again → refactor → verify 80%+ coverage. Covers all three test types: unit (Jest/Vitest patterns), integration (API endpoint tests), and E2E (Playwright patterns). Enforces test isolation, one assertion per test, descriptive names, semantic selectors, and mocking of external services. Includes CI/CD integration (GitHub Actions) and watch mode setup. |
| **strategic-compact** | Session context window management — guides when to manually compact the AI context at logical task boundaries rather than letting auto-compaction trigger mid-task. Tracks tool call counts and suggests compaction after configurable thresholds (default: 50 tool calls). Includes a phase-transition decision table (e.g., compact after research before coding; do NOT compact mid-implementation), a guide to what survives vs what is lost in compaction, and token optimisation patterns including trigger-table lazy loading of skills and duplicate instruction detection. |
| **search-first** | Structured 5-step workflow for finding existing solutions before writing custom code: need analysis → parallel search (npm/PyPI, MCP servers, GitHub, existing codebase) → evaluate candidates (functionality, maintenance, community, docs, license) → decide (adopt as-is / extend-wrap / build custom) → implement. Includes a decision matrix, search shortcuts by category, integration with planner/architect agents, and anti-patterns to avoid (jumping to code, ignoring MCP servers, dependency bloat). |
| **verification-loop** | 6-phase verification system run after completing features, before PRs, and after refactoring: Phase 1 Build (does it compile?), Phase 2 Type Check (TypeScript/Pyright), Phase 3 Lint, Phase 4 Test Suite (with coverage — 80% minimum target), Phase 5 Security Scan (hardcoded secrets, stray debug logs), Phase 6 Diff Review (unintended changes, missing error handling, edge cases). Produces a formal VERIFICATION REPORT with pass/fail per phase and an overall READY/NOT READY verdict. |

---

### Frontend Skills

| Skill | Triggered by | Purpose |
|-------|-------------|---------|
| **frontend-patterns** | React, Next.js, Angular, Vue, Svelte, React Native, Flutter, Blazor, MAUI | Component design patterns, state management, rendering strategies, accessibility, and performance optimisation for frontend frameworks. |
| **e2e-testing** | Any frontend framework, Playwright, Cypress | End-to-end test strategy, page object models, selector best practices, and CI integration for browser-based testing. |

---

### Backend Skills

| Skill | Triggered by | Purpose |
|-------|-------------|---------|
| **backend-patterns** | Any backend framework | RESTful service design, middleware patterns, request lifecycle, logging, health checks, and graceful shutdown. |
| **api-design** | Any backend framework or API style (REST, GraphQL, gRPC, tRPC) | API contract design, versioning strategy, pagination, error response format, OpenAPI documentation, and client SDK considerations. |

---

### C# / .NET Skills

| Skill | Triggered by | Purpose |
|-------|-------------|---------|
| **dotnet-patterns** | C#, ASP.NET Core, .NET, Blazor, MAUI | Idiomatic C# conventions, project structure, DI registration, async/await patterns, EF Core usage, `record` types, nullable reference types, and `IOptions<T>` configuration. |
| **dotnet-security** | C#, ASP.NET Core, .NET | ASP.NET Core authentication/authorisation, `IDataProtectionProvider`, JWT configuration, security headers middleware, CORS policy, `dotnet user-secrets`, Azure Key Vault integration, and vulnerable package scanning. |
| **dotnet-tdd** | C#, ASP.NET Core, .NET | xUnit, Moq, FluentAssertions patterns, `WebApplicationFactory` integration testing, Testcontainers for real database tests, `coverlet` coverage reporting. |
| **dotnet-verification** | C#, ASP.NET Core, .NET | Pre-ship verification checklist: compiler warnings as errors, `dotnet format`, async correctness, EF Core migration review, secrets check, Docker build, release build. |

---

### Python Skills

| Skill | Triggered by | Purpose |
|-------|-------------|---------|
| **python-patterns** | Python (FastAPI, Flask) | Pythonic idioms, type annotations, virtual environment management, `pyproject.toml` configuration, async patterns with `asyncio`. |
| **python-testing** | Python (FastAPI, Flask) | pytest patterns, fixtures, `httpx` for async API testing, coverage with `pytest-cov`. |
| **django-patterns** | Django | Django app structure, model design, URL routing, class-based views, custom managers, signals, and middleware. |
| **django-security** | Django | Django security settings checklist, CSRF protection, `SECRET_KEY` management, `ALLOWED_HOSTS`, SQL injection prevention, and permission classes. |
| **django-tdd** | Django | `TestCase` vs `TransactionTestCase`, `Client` and `APIClient` usage, factory-boy fixtures, database reset strategies. |
| **django-verification** | Django | Pre-ship checklist for Django: `manage.py check --deploy`, migration completeness, security settings, static files. |

---

### Java / Spring Boot Skills

| Skill | Triggered by | Purpose |
|-------|-------------|---------|
| **java-coding-standards** | Java | Java conventions, package structure, `Optional` usage, stream API patterns, checked vs unchecked exceptions, Lombok usage guidelines. |
| **jpa-patterns** | Java / JPA, Spring Boot | Entity design, relationship mapping, `@Transactional` boundaries, JPQL vs native query guidelines, second-level cache. |
| **springboot-patterns** | Spring Boot | Spring Boot project structure, `@Configuration` classes, bean lifecycle, `@Profile` for environment config, Actuator setup. |
| **springboot-security** | Spring Boot | Spring Security configuration, JWT with Spring Security, method-level security, CSRF for SPAs, OAuth2 resource server. |
| **springboot-tdd** | Spring Boot | `@SpringBootTest`, `@WebMvcTest`, `@DataJpaTest`, MockMvc, Testcontainers, WireMock for external services. |
| **springboot-verification** | Spring Boot | Pre-ship checklist: Maven/Gradle build clean, `spring.profiles.active` verified, Actuator `/health` live, DB migrations complete. |

---

### Go Skills

| Skill | Triggered by | Purpose |
|-------|-------------|---------|
| **golang-patterns** | Go | Idiomatic Go: interface design, error wrapping with `fmt.Errorf`, goroutine lifecycle, channel patterns, context propagation, and package structure. |
| **golang-testing** | Go | Go testing conventions: table-driven tests, `testify`, subtests with `t.Run`, benchmarks, race detector usage. |

---

### PHP / Laravel Skills

| Skill | Triggered by | Purpose |
|-------|-------------|---------|
| **laravel-patterns** | PHP / Laravel | Laravel project structure, Eloquent ORM patterns, service containers, job queues, event/listener architecture. |
| **laravel-security** | PHP / Laravel | Laravel security: CSRF, XSS prevention, mass assignment protection, rate limiting, `env()` secrets management. |
| **laravel-tdd** | PHP / Laravel | PHPUnit with Laravel, `RefreshDatabase`, factories, HTTP tests with `$this->get()` / `$this->post()`. |
| **laravel-verification** | PHP / Laravel | Pre-ship checklist: `php artisan optimize`, `config:cache`, `route:cache`, migration status, `.env.production` review. |

---

### Swift / iOS Skills

| Skill | Triggered by | Purpose |
|-------|-------------|---------|
| **swift-actor-persistence** | Swift, iOS native | Swift actor model for thread-safe state, `@MainActor`, background persistence with Core Data / SwiftData. |
| **swift-protocol-di-testing** | Swift, iOS native | Protocol-oriented design for testability, dependency injection in SwiftUI and UIKit, mock generation patterns. |
| **swift-concurrency-6-2** | Swift, iOS native | Swift Concurrency: `async`/`await`, `Task`, `TaskGroup`, `AsyncStream`, structured concurrency patterns for Swift 6.2. |
| **liquid-glass-design** | iOS native (Swift) | Apple Liquid Glass design language, visionOS/iOS 18+ visual design patterns, material effects, adaptive layouts. |
| **foundation-models-on-device** | iOS native (Swift) | Apple Foundation Models framework, on-device inference patterns, prompt engineering for Apple Intelligence, privacy-preserving ML. |

---

### C++ Skills

| Skill | Triggered by | Purpose |
|-------|-------------|---------|
| **cpp-coding-standards** | C++ | Modern C++ (17/20) idioms, RAII, smart pointers, move semantics, const-correctness, naming conventions. |
| **cpp-testing** | C++ | Google Test / Catch2 patterns, test fixture setup, mock objects with Google Mock, CMake test integration. |

---

### Perl Skills

| Skill | Triggered by | Purpose |
|-------|-------------|---------|
| **perl-patterns** | Perl | Modern Perl idioms, module structure, `use strict` / `use warnings`, Moose/Moo OOP, CPAN dependency management. |
| **perl-security** | Perl | Taint mode, input sanitisation, `DBI` parameterised queries, safe file handling. |
| **perl-testing** | Perl | `Test::More`, `Test::MockObject`, `prove` runner, TAP output, test coverage with `Devel::Cover`. |

---

### Database Skills

| Skill | Triggered by | Purpose |
|-------|-------------|---------|
| **postgres-patterns** | PostgreSQL | Schema design, index strategy, JSONB patterns, window functions, `EXPLAIN ANALYZE` usage, connection pooling with PgBouncer. |
| **database-migrations** | Any database | Migration discipline: always-forward migrations, rollback scripts, zero-downtime migration patterns, testing migrations in CI. |

---

### Infrastructure Skills

| Skill | Triggered by | Purpose |
|-------|-------------|---------|
| **docker-patterns** | Docker, Docker Compose | Dockerfile best practices, multi-stage builds, layer caching, non-root user, `.dockerignore`, Compose service design. |
| **deployment-patterns** | Docker, Kubernetes, any CI/CD | Blue/green and canary deployment strategies, health check endpoints, rollback procedures, environment variable management. |

---

### RapidX Enterprise Skills — Always Loaded with Profile

| Skill | Purpose |
|-------|---------|
| **ai-governance** | Establishes guardrails for responsible and auditable AI-assisted development. Defines audit trail requirements (log session start/end, decisions, review gate outcomes), human oversight gates (AI must never autonomously push to production, modify auth/authorisation logic, change database schemas, or handle credentials without human review), context hygiene (load only relevant skills, avoid sensitive business logic in context), and a review checklist for all AI-generated code (logic correctness, security, version compatibility, test coverage, error handling). Includes additional traceability requirements for regulated profiles. |
| **client-onboarding** | Structured client discovery checklist covering: industry and size (determines compliance profile), current tech stack (determines component selection), engineering maturity (determines starting maturity level), existing coding standards to preserve, required reviewers for different change types, and CI/CD pipeline details. Used by the Client Onboarder agent to configure a complete client profile. |
| **review-gates** | Defines 4 standard human review checkpoints with triggers and checklists: Code Review Gate (before merging to main — readability, logic, tests), Security Review Gate (auth/payment/sensitive data changes — secrets, input validation, OWASP controls), Architecture Review Gate (new services, schema changes, infra — alignment, dependencies, rollback), Database Review Gate (migrations, large table queries — reversibility, zero-downtime, indexes). Also defines compliance-specific gates for pharma (IQ/OQ/PQ validation, e-signatures), SOX (IT controls, segregation of duties), and HIPAA (PHI handling, encryption, access control). |
| **pod-maturity** | A passive reference guide injected into agent context so every AI response is calibrated to your team's current maturity level (L0–L4). Loaded from the active client profile, it tells the agent what level you are at, what behaviours define that level, and what the upgrade path looks like — so planning, review, and execution suggestions automatically match your team's actual autonomy and governance posture. Use `/rapidx:maturity-gate` (Claude Code) or the equivalent `.prompt.md` in Copilot to get a checklist of what requirements are met and what is still needed to advance to the next level. |
| **architecture-copilot** | Assists with architectural decision making by providing an ADR (Architecture Decision Record) template (context, decision, consequences, alternatives considered), 6 architectural principles for AI-assisted projects (explicit over implicit, reversible decisions first, version-pinned dependencies, separation of concerns, observable systems, security by design), and an architecture review checklist (ADR documented, trade-offs noted, consistent with existing patterns, version compatibility verified, security and scalability considered). |
| **migration-framework** | 4-phase framework for legacy system modernisation: Phase 1 Discovery (map codebase, document architecture, identify seams, produce risk register), Phase 2 Strategy (choose from strangler fig / big bang / branch-by-abstraction / database-first), Phase 3 Execution (strangler-fig iteration: smallest slice → facade → route traffic → verify parity → decommission), Phase 4 Validation (functional parity, performance benchmarks, data integrity, security posture, rollback plan). Key patterns: dual-write for data consistency during cutover, feature flag traffic routing (1% → 100%), shadow mode and contract testing. Active for `modernization` engagement types. |

---

## Tech Stack → Components Quick Reference

| Stack | Rules | Key Skills Added | Key Agents Added |
|-------|-------|-----------------|-----------------|
| TypeScript / JS | common + typescript | _(baseline)_ | _(baseline)_ |
| **C# / .NET / ASP.NET** | common | dotnet-patterns, dotnet-security, dotnet-tdd, dotnet-verification, backend-patterns, api-design | csharp-reviewer |
| **Blazor** | common | dotnet-patterns, dotnet-security, frontend-patterns | csharp-reviewer |
| Python / FastAPI | common + python | python-patterns, python-testing, backend-patterns, api-design | python-reviewer |
| Python / Django | common + python | django-patterns, django-security, django-tdd, django-verification, backend-patterns | python-reviewer |
| Java / Spring Boot | common + java | springboot-patterns, springboot-security, springboot-tdd, java-coding-standards, jpa-patterns | _(baseline)_ |
| Go | common + golang | golang-patterns, golang-testing, backend-patterns, api-design | go-reviewer, go-build-resolver |
| PHP / Laravel | common + php | laravel-patterns, laravel-security, laravel-tdd, backend-patterns | _(baseline)_ |
| React / Next.js / Angular / Vue | _(language rules)_ | frontend-patterns, e2e-testing | e2e-runner, refactor-cleaner |
| Swift / iOS | common + swift | swift-actor-persistence, swift-protocol-di-testing, swift-concurrency-6-2, liquid-glass-design | _(baseline)_ |
| PostgreSQL | _(language rules)_ | postgres-patterns, database-migrations | database-reviewer |
| Any other DB | _(language rules)_ | database-migrations | database-reviewer |
| Docker / Kubernetes | _(language rules)_ | docker-patterns, deployment-patterns | _(baseline)_ |
| Any CI/CD | _(language rules)_ | deployment-patterns | _(baseline)_ |

> **Baseline** = planner, architect, tdd-guide, code-reviewer, security-reviewer, build-error-resolver, doc-updater + governance-auditor, compliance-checker, migration-analyst, client-onboarder

---

## Totals

| Category | Count |
|----------|-------|
| Core agents (always active) | 7 |
| Stack-conditional agents | 6 |
| RapidX enterprise agents | 4 |
| SDD & Knowledge agents | 4 |
| **Total agents** | **21** |
| Core skills (always loaded) | 6 |
| .NET / C# skills | 4 |
| Python skills | 6 |
| Java / Spring Boot skills | 6 |
| Go skills | 2 |
| PHP / Laravel skills | 4 |
| Swift / iOS skills | 5 |
| C++ skills | 2 |
| Perl skills | 3 |
| Frontend skills | 2 |
| Backend / API skills | 2 |
| Database skills | 2 |
| Infrastructure skills | 2 |
| RapidX enterprise skills | 6 |
| **Total skills** | **52** |
