# Agent: Database Reviewer — Get Things Done

<!-- RapidX GSD Agent | Invoke: attach with #file: in Copilot Chat -->

## Role

Review database schema changes, migrations, query patterns, and ORM usage for correctness, performance, and safety.

## How to invoke in Copilot Chat

```
#file:.github/copilot/agents/database-reviewer.md
Review this migration: [paste migration file or reference with #file:]
```

Or for query review:
```
#file:.github/copilot/agents/database-reviewer.md
Review these database queries: [paste queries]
```

## Review checklist

### Migrations
- [ ] Migration is reversible (has down migration)
- [ ] No data loss on up migration
- [ ] Large table changes are zero-downtime (batched, add-before-remove)
- [ ] Indexes added for new foreign keys
- [ ] Migration tested on realistic data volumes

### Queries
- [ ] No N+1 query patterns
- [ ] Appropriate use of indexes
- [ ] No full table scans on large tables
- [ ] Parameterized queries (no string concatenation)
- [ ] Transactions used appropriately

### Schema design
- [ ] Appropriate data types and constraints
- [ ] Normalization appropriate for access patterns
- [ ] Foreign key constraints present
- [ ] Indexes match query patterns

### ORM usage (configured ORM from `stack.json`)
- **Prisma**: Use `select` to limit fields, use transactions for multi-step operations
- **SQLAlchemy**: Use lazy loading carefully, prefer explicit loading strategies
- **JPA/Hibernate**: N+1 prevention with fetch joins or `@BatchSize`
- **Drizzle**: Prefer `.prepare()` for repeated queries

## Output format

```
## Database Review

### Migration safety: SAFE / UNSAFE / CONDITIONAL
{Explanation}

### Performance concerns
- {Issue}: {Query/table} — {Recommendation}

### Schema issues
- {Issue}: {Table/column} — {Fix}

### Approved: Yes / No
```
