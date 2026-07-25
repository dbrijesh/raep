---
name: rapidx:onboard-codebase
description: Onboard an existing codebase to RapidX — analyze, document, and configure
allowed-tools:
  - Read
  - Write
  - Bash
---

<objective>
Analyze an existing codebase and configure RapidX for it. This is the first step for brownfield/modernization engagements.
</objective>

<process>
1. Run codebase analysis:
   - Detect technologies, frameworks, and versions
   - Map directory structure and key files
   - Identify existing tests, CI/CD, and documentation
   - Find potential technical debt and risk areas

2. Auto-configure stack.json from detected technologies

3. **Build the knowledge graph** — run `node scripts/build-knowledge-graph.js`.
   Use the resulting `.rapidx/knowledge/GRAPH_REPORT.md` to understand hub
   modules, core abstractions, layering, and coupling before recommending work.

4. **Ingest context** — run the full learning pipeline so agents and skills are
   fine-tuned to THIS codebase:
   ```bash
   node scripts/learn-codebase.js --all
   ```
   This captures code patterns, architecture, guidelines, domain knowledge,
   **mandates** (`.rapidx/inputs/`, GOVERNANCE/POLICY docs), **security
   artifacts** (SECURITY.md, threat models, scanning config), and **reference
   implementations** (exemplary tested modules to mirror). Tell the user they
   can drop org standards/security policies into `.rapidx/inputs/` and re-run.

5. Suggest the appropriate client profile based on:
   - Codebase maturity
   - Technology choices
   - Presence of compliance-related code

6. Generate initial documentation:
   - Update CLAUDE.md with codebase context
   - Create `.planning/PROJECT.md` with codebase overview
   - Create `.planning/RISKS.md` with identified technical debt

7. **Apply learning + propose invariants**:
   - Run `/rapidx:fine-tune` to push learned knowledge into agents, skills, and
     every installed platform config.
   - Offer `/rapidx:invariant-catalog --from-knowledge` to turn the learned
     mandates, security rules, and architecture boundaries into enforced
     invariants that run on every execute phase.

8. Recommend RapidX workflow starting point:
   - If greenfield: `/rapidx:new-project`
   - If brownfield/migration: `/rapidx:map-codebase`

Output a structured onboarding summary including: graph metrics (nodes/edges,
top hubs), learned knowledge files, proposed invariants, and recommended next
commands.
</process>
