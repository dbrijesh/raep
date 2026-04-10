# Skill: ADR Management

**Applies to**: All platforms
**Category**: Architecture
**Always installed**: Yes

## What this skill does

Teaches AI agents to create, read, and enforce Architecture Decision Records (ADRs). ADRs are the foundation of RapidX's learning system — accepted decisions automatically become enforcement rules, and deprecated decisions become anti-patterns that code reviewers flag.

## ADR lifecycle

```
Decision needed
      ↓
/rapidx:adr new [title]     → docs/adr/{####}-{title}.md (Status: Proposed)
      ↓
Team review
      ↓
Update status to: Accepted  → becomes enforcement rule for all agents
      ↓
Code changes over time
      ↓
/rapidx:learn-arch          → re-reads all ADRs, updates knowledge base
      ↓
/rapidx:fine-tune           → propagates ADR rules to all platform configs
```

## ADR impact on agents

When an ADR is **Accepted**:
- `code-reviewer` adds it to review checklist
- `spec-writer` validates new specs against it
- `architect` references it in design guidance
- `knowledge-curator` includes it in architecture.md

When an ADR is **Deprecated** or **Superseded**:
- `knowledge-curator` adds the old pattern to `anti-patterns.md`
- `code-reviewer` flags code following the deprecated pattern
- New specs are warned against using the deprecated approach

## Commands

| Command | What it does |
|---------|-------------|
| `/rapidx:adr new [title]` | Create a new ADR (Proposed status) |
| `/rapidx:adr list` | List all ADRs with status |
| `/rapidx:adr check` | Check current diff against accepted ADRs |
| `/rapidx:learn-arch` | Re-read all ADRs and update knowledge base |

## Directory structure

```
docs/
└── adr/
    ├── README.md           # ADR index (auto-updated)
    ├── 0001-{title}.md
    ├── 0002-{title}.md
    └── ...
```

## ADR numbering

4-digit zero-padded sequential numbers (0001, 0002, ...).
The adr-writer agent manages numbering automatically.

## Integration with spec-driven development

Every spec must include a "Constitution Check" section that verifies compliance with accepted ADRs. The spec-review process (`/rapidx:spec-review`) automatically checks the spec against all accepted ADRs.

## ADR templates

Available templates:
- Standard ADR (decision + rationale + consequences)
- RFC (Request for Comments) — for larger decisions needing team input
- Tech Radar entry — for library/tool adoption decisions
