---
name: migration-framework
description: RapidX migration framework skill — structured approach for legacy system modernization and migration projects.
origin: RapidX
---

# Skill: Migration Framework

## Purpose

Provides a structured framework for legacy system modernization and migration projects. Covers analysis, planning, strangler-fig execution, and validation.

## When to use

- Modernizing a legacy monolith to microservices
- Migrating from one technology stack to another
- Extracting features from a legacy system
- Database migrations across technologies

## Migration phases

### Phase 1: Discovery and mapping
1. Run `/rapidx:map-codebase` to analyze the existing system
2. Document current architecture and data flows
3. Identify seams and boundaries for decomposition
4. Assess technical debt and risk areas
5. Produce a migration risk register

### Phase 2: Migration strategy
Choose a strategy:
- **Strangler Fig** — Gradually replace functionality behind a facade (recommended for large systems)
- **Big Bang** — Replace all at once (only for small systems with full test coverage)
- **Branch by abstraction** — Introduce abstraction layer, migrate behind it
- **Database-first** — Migrate data model first, then application layer

### Phase 3: Execution
For strangler-fig migrations:
1. Identify the smallest valuable slice to migrate first
2. Create facade/proxy in new system
3. Route traffic to new system for that slice
4. Verify parity between old and new
5. Decommission old slice
6. Repeat

### Phase 4: Validation
- Functional parity testing against old system
- Performance benchmarking
- Data integrity verification
- Security posture assessment
- Rollback plan validation

## Key patterns

### Dual-write pattern
During migration, write to both old and new systems to ensure data consistency before cutover.

### Feature flag cutover
Use feature flags to gradually route traffic to the new system. Start with 1%, increase to 100% as confidence grows.

### Migration testing
- Shadow mode testing: run new system in parallel, compare outputs
- Contract testing: verify API compatibility between old and new
- Data reconciliation: periodic comparison of data between systems

## Anti-patterns to avoid

- Migrating without test coverage in the new system
- Trying to migrate everything at once
- Not defining "done" criteria for each migration slice
- Skipping performance testing until after cutover
