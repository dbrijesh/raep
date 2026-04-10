---
name: rapidx:learn-arch
description: "Deep architecture analysis — learn from ADRs, diagrams, ARCHITECTURE.md, and design docs"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
---

<objective>
Perform a deep analysis of the project's architecture artifacts — Architecture Decision Records (ADRs), diagrams, design documents, and system documentation — and produce a comprehensive architecture knowledge map in `.rapidx/knowledge/architecture.md`. This knowledge is injected into all planning, reviewing, and design agents.
</objective>

<process>
## Step 1 — Discover architecture artifacts

Scan for:
```
ARCHITECTURE.md               # Primary architecture doc
docs/ARCHITECTURE*.md         # Any architecture variations
docs/adr/*.md                 # Architecture Decision Records
docs/decisions/*.md           # Alternative ADR location
architecture/decisions/*.md   # Alternative
decisions/*.md
*.puml                        # PlantUML diagrams
*.mermaid, *.mmd              # Mermaid diagrams
docs/diagrams/**              # Diagram files
DESIGN.md, docs/DESIGN*.md    # Design documents
RUNBOOK.md                    # Operational knowledge
docs/api/*.md, docs/api/*.yaml # API documentation
openapi.yaml, swagger.yaml    # API specs
```

Also look for user-provided inputs in:
```
$ARGUMENTS                    # Specific file or directory if provided
.rapidx/inputs/               # User-dropped documents
```

## Step 2 — Analyze each artifact type

### ARCHITECTURE.md analysis
Extract:
- System overview and goals
- Component inventory (name, responsibility, tech)
- Integration topology (who calls whom)
- Data flow descriptions
- External dependencies
- Non-functional requirements (scale, availability, latency)

### ADR analysis
For each ADR, extract:
```
ADR-{number}: {title}
  Status: {Proposed/Accepted/Deprecated/Superseded}
  Decision: {what was decided}
  Context: {why the decision was needed}
  Consequences: {what changes with this decision}
  Still valid: {yes/no} — check if code matches}
```

Flag ADRs whose decisions appear to be violated in current code.

### Diagram analysis
Interpret mermaid/plantuml diagrams to extract:
- Service/component relationships
- Data flow directions
- External system integrations
- Database topology

### API spec analysis
From openapi.yaml/swagger:
- List of all endpoints with methods
- Request/response shapes
- Auth mechanisms
- Error patterns

## Step 3 — Generate architecture knowledge map

Write `.rapidx/knowledge/architecture.md`:

```markdown
# Architecture Knowledge Map

**Analyzed**: {DATE}
**Sources**: {list of artifacts}
**Confidence**: High/Medium/Low (based on completeness of artifacts)

---

## System Overview

{1-3 paragraph description of what the system does and its key architectural characteristics}

## Component Map

| Component | Type | Technology | Responsibility |
|-----------|------|------------|----------------|
| {name} | Service/Library/UI/DB | {tech@version} | {description} |

## Integration Topology

```
{ASCII or mermaid diagram of how components connect}
```

## Active Architecture Decisions

### Must Follow (Accepted ADRs)
{ADR summaries that are currently in force}

### Deprecated Patterns (do NOT use)
{ADRs that are deprecated or superseded — patterns to avoid}

### Open Decisions (Proposed ADRs)
{ADRs still under consideration}

## Data Architecture

### Key Entities
| Entity | Location | Description |
|--------|----------|-------------|
| {name} | {service/db} | {description} |

### Data Flow
{How data moves through the system}

## API Surface

### Internal APIs
{Endpoint inventory from openapi.yaml}

### External Integrations
{Third-party APIs and systems the project depends on}

## Non-Functional Characteristics

| Concern | Current Approach | Target |
|---------|-----------------|--------|
| Scalability | {approach} | {target} |
| Availability | {approach} | {target} |
| Latency | {approach} | {target} |
| Security | {approach} | {target} |

## Architecture Anti-Patterns (Avoid)

{Patterns that were explicitly rejected, deprecated, or that violate ADRs}

## Architecture Gaps & Risks

{Areas where architecture docs are missing, outdated, or where implementation diverges from documented intent}
```

## Step 4 — Generate ADR index

Write `.rapidx/knowledge/adr-index.md`:
```markdown
# Architecture Decision Record Index

| # | Title | Status | Date | Key Decision |
|---|-------|--------|------|-------------|
| 001 | {title} | Accepted | {date} | {one-line} |
```

## Step 5 — Output

```
Architecture Analysis Complete

  Sources analyzed: {N} files
  ADRs processed: {N} ({N} accepted, {N} deprecated, {N} proposed)

  Generated:
    .rapidx/knowledge/architecture.md   (architecture knowledge map)
    .rapidx/knowledge/adr-index.md      (ADR reference index)

  Violations found: {N} (code patterns that violate accepted ADRs)
    {list violations if any}

  Next:
    /rapidx:fine-tune          → Apply architecture knowledge to agents
    /rapidx:knowledge-sync     → Sync to all platform configs
    /rapidx:spec               → Create specs that respect architecture
```
</process>
