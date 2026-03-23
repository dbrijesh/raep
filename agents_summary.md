# RapidX — Agents & Skills Summary

> **RapidX Agentic Engineering Platform v1.0.0**
> A unified enterprise-grade SDLC orchestration framework for AI-assisted software delivery.

---

## Agents

Agents are specialised AI subagents that perform discrete roles during planning, development, review, testing, and governance. They are activated automatically based on task type and the project's configured tech stack — only relevant agents are loaded into context.

---

### Core Agents — Always Active

These agents are present in every project regardless of tech stack.

| Agent | Role |
|-------|------|
| **Planner** | Translates project goals into structured requirements, roadmaps, and phase plans. Produces phased task breakdowns with acceptance criteria, dependency mapping, and risk identification. Adapts plans to the configured tech stack and version constraints. |
| **Architect** | Handles system design, component architecture, API contract definition, and technology decisions. Produces Architecture Decision Records (ADRs). Enforces version-constrained design — only designs with APIs available in the configured stack versions. |
| **TDD Guide** | Drives test-driven development discipline. Generates test plans before implementation, guides the red-green-refactor cycle, sets coverage targets, and reviews test quality. |
| **Code Reviewer** | General-purpose code reviewer. Checks for correctness, style consistency, error handling, dead code, and alignment with the active coding standards. Works alongside language-specific reviewers when a specialist is available. |
| **Security Reviewer** | Performs OWASP Top 10 checks, reviews authentication/authorisation patterns, secrets handling, input validation, and framework-specific security configurations. Blocks ship on critical findings. |
| **Build Error Resolver** | Diagnoses compilation errors, dependency conflicts, and build pipeline failures. Produces a root-cause analysis and a concrete fix plan. |
| **Doc Updater** | Keeps documentation in sync with code changes. Updates READMEs, API docs, architecture diagrams, and changelogs as part of each completed task. |

---

### Frontend Agents — Active when a frontend framework is in the stack

| Agent | Triggered by | Role |
|-------|-------------|------|
| **E2E Runner** | React, Next.js, Angular, Vue, Svelte, Blazor, React Native, Flutter, Playwright, Cypress | Orchestrates end-to-end test execution. Writes and maintains E2E test suites, interprets failures, and reports coverage against acceptance criteria. |
| **Refactor Cleaner** | React, Next.js, Angular, Vue, Svelte | Identifies and executes safe refactors: component decomposition, dead code removal, prop drilling elimination, and performance anti-pattern cleanup. |

---

### Backend Language Agents — Active when the matching language is in the stack

| Agent | Triggered by | Role |
|-------|-------------|------|
| **C# / .NET Reviewer** | C#, ASP.NET Core, .NET, Blazor, MAUI | Specialist reviewer for C# codebases. Checks async/await correctness (flags `.Result`/`.Wait()`), EF Core N+1 patterns, DI lifetime mismatches, nullable reference handling, security headers, and .NET-specific OWASP issues. |
| **Python Reviewer** | Python (FastAPI, Django, Flask) | Specialist reviewer for Python codebases. Checks Pythonic idioms, type annotations, async patterns, and Python-specific security concerns. |
| **Go Reviewer** | Go | Specialist reviewer for Go codebases. Checks error handling conventions, goroutine safety, interface design, and Go-specific performance patterns. |
| **Go Build Resolver** | Go | Diagnoses Go-specific build and module errors: missing imports, version conflicts in `go.mod`, CGO issues. |

---

### Database Agent — Active when any database is in the stack

| Agent | Triggered by | Role |
|-------|-------------|------|
| **Database Reviewer** | PostgreSQL, MySQL, MongoDB, DynamoDB, SQL Server, SQLite, MariaDB | Reviews schema designs, migration scripts, query patterns, indexing strategy, and data access layer code. |

---

### RapidX Enterprise Agents — Always Active

These agents handle governance, compliance, and client management concerns.

| Agent | Role |
|-------|------|
| **Governance Auditor** | Audits projects against the active client profile's governance requirements. Generates compliance reports, flags policy violations, and tracks review gate completion. |
| **Migration Analyst** | Analyses legacy codebases for modernisation engagements. Maps existing architecture, identifies migration risk areas, estimates effort, and produces a migration roadmap. Active when engagement type is `modernization`. |
| **Compliance Checker** | Validates that code and processes meet regulatory requirements for the active compliance framework (21 CFR Part 11, SOX, HIPAA). Blocks ship when mandatory compliance controls are not met. |
| **Client Onboarder** | Guides client discovery — collects project context, governance requirements, tech stack details, and compliance mandates to configure a custom client profile. |

---

## Skills

Skills are reusable prompt modules that provide domain-specific knowledge and patterns. They are injected into agent context selectively — only skills relevant to the project's tech stack are loaded. A React + TypeScript + PostgreSQL project loads ~18–20 skills; a Java + Spring Boot project loads a different set.

---

### Core Skills — Always Loaded

| Skill | Purpose |
|-------|---------|
| **coding-standards** | Universal coding standards: naming conventions, file organisation, error handling, commenting discipline, and code readability rules that apply across all languages and frameworks. |
| **security-review** | OWASP Top 10 guidance, input validation, authentication patterns, authorisation checks, secrets management, and secure defaults. Applied to every review regardless of stack. |
| **tdd-workflow** | Red-green-refactor cycle, test structure conventions, coverage strategy, mocking guidelines, and the discipline of writing tests before implementation. |
| **strategic-compact** | Context efficiency — how to communicate intent clearly to AI agents, structure prompts effectively, and avoid token waste on irrelevant context. |
| **search-first** | Research-before-coding discipline: always verify existing solutions, check library docs, and understand the problem space before writing new code. |
| **verification-loop** | Structured verification: systematically confirm that completed code matches requirements, passes tests, and handles edge cases before marking work done. |

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
| **ai-governance** | Responsible AI usage guidelines: data privacy, bias awareness, human oversight requirements, audit trail expectations, and acceptable use boundaries for AI-generated code. |
| **client-onboarding** | Structured client discovery: collecting project context, governance requirements, tech stack details, compliance mandates, and team preferences to initialise a client profile. |
| **review-gates** | Review gate workflow: which gates are mandatory, how to trigger them, what evidence is required, and how to document gate outcomes for audit purposes. |
| **pod-maturity** | A passive reference guide injected into agent context so every AI response is calibrated to your team's current maturity level (L0–L4). Loaded from the active client profile, it tells the agent what level you are at, what behaviours define that level, and what the upgrade path looks like — so planning, review, and execution suggestions automatically match your team's actual autonomy and governance posture. Use `/rapidx:maturity-gate` to get a checklist of what requirements are met and what is still needed to advance to the next level. |
| **architecture-copilot** | Architecture guidance and ADR (Architecture Decision Record) generation. Provides structured templates, decision frameworks, and technology evaluation criteria. |
| **migration-framework** | Legacy modernisation framework for brownfield engagements: codebase analysis methodology, strangler fig pattern guidance, data migration strategy, and risk-tiered migration sequencing. Active for `modernization` engagement types. |

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
| **Total agents** | **17** |
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
