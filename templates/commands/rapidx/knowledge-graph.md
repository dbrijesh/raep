---
name: rapidx:knowledge-graph
description: "Build and query a code knowledge graph of the repository (GitNexus-style) for impact analysis and onboarding"
allowed-tools:
  - Read
  - Bash
  - Glob
---

<objective>
Build a knowledge graph of the codebase — files, classes, functions, modules and
the import/contains/extends relationships between them — and use it for impact
analysis, onboarding, and seeding invariants. Inspired by GitNexus, but built
with zero external dependencies (Node built-ins only) so it runs on any platform
offline. An optional richer build is available when the `graphify` CLI is
installed.
</objective>

<process>
## Build

```bash
node scripts/build-knowledge-graph.js          # native, zero-dependency
node scripts/build-knowledge-graph.js --rich   # use graphify CLI if installed
```

Artifacts written to `.rapidx/knowledge/`:
- `graph.json` — nodes + edges (machine-queryable)
- `graph.html` — self-contained interactive force-directed viewer (open in browser)
- `GRAPH_REPORT.md` — hub modules, most-imported files, external deps, orphans

## Query

```bash
# Neighbourhood / impact of anything matching a term (2-hop BFS):
node .rapidx/hooks/lib/graph-query.cjs <term>

# Direct dependents & dependencies of a file (in code):
node -e "console.log(JSON.stringify(require('./.rapidx/hooks/lib/graph-query.cjs').impact(process.cwd(),'src/foo.ts'),null,2))"
```

## When to use

- **Onboarding** (`/rapidx:onboard-codebase` calls this automatically): understand
  structure and coupling before touching anything.
- **Before edits**: query the graph for blast radius of a change.
- **Seeding invariants**: `/rapidx:invariant-catalog` reads `graph.json` to propose
  architecture-boundary invariants.
- **Fine-tuning**: `/rapidx:fine-tune` injects hub/contract summaries into agents.

## Report back

Summarise: node/edge counts, top 5 hub modules, top 5 most-imported files, and
any obvious layering observations. Point the user to `graph.html` for the
interactive view.

Arguments ($ARGUMENTS):
  (none)     → build native graph + report
  --rich     → use graphify CLI if available
  --query <term> → build (if stale) then query the term
</process>
