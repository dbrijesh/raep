---
name: rapidx:understand-anything-knowledge
description: "Analyze a Karpathy-pattern LLM wiki knowledge base and build a knowledge graph"
argument-hint: "[wiki-directory]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
---

<objective>
Analyze a Karpathy-pattern LLM wiki (three-layer: raw sources, wiki markdown, schema file) and produce an interactive knowledge graph dashboard.
</objective>

<context>
Detects and analyzes the Karpathy wiki pattern:
- **Raw sources**: immutable source documents in `raw/`
- **Wiki**: LLM-generated `.md` files with wikilinks (`[[target]]` syntax)
- **Schema**: `CLAUDE.md`, `AGENTS.md`, or similar config
- **index.md**: content catalog by categories
- **log.md**: operation log

Detection: directory has `index.md` + multiple `.md` files containing wikilinks.
</context>

<process>
1. Determine target directory from $ARGUMENTS or CWD
2. Resolve plugin root:
   ```bash
   PLUGIN_ROOT="$HOME/.understand-anything-plugin"
   SKILL_DIR="$PLUGIN_ROOT/skills/understand-knowledge"
   ```
3. **Phase 1 — Detect**: run format detection script:
   ```bash
   python3 "$SKILL_DIR/parse-knowledge-base.py" <TARGET_DIR>
   ```
   - Writes `scan-manifest.json` to `<TARGET_DIR>/.understand-anything/intermediate/`
   - Announces: "Detected Karpathy wiki: N articles, N sources, N topics, N wikilinks"
   - If script exits non-zero: not a Karpathy wiki — explain what was expected and stop
4. **Phase 3 — Analyze**: dispatch `article-analyzer` subagents in batches of 10-15 articles (up to 3 concurrent); agent writes `analysis-batch-{N}.json` to the intermediate directory
5. **Phase 4 — Merge**: run:
   ```bash
   python3 "$SKILL_DIR/merge-knowledge-graph.py" <TARGET_DIR>
   ```
6. **Phase 5 — Save**: validate and write to `<TARGET_DIR>/.understand-anything/knowledge-graph.json`; write meta.json; clean up intermediate files
7. Auto-launch `/rapidx:understand-anything-dashboard <TARGET_DIR>`
</process>
