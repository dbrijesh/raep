---
name: rapidx:understand-anything-diff
description: "Analyze impact of current code changes using the knowledge graph"
allowed-tools:
  - Read
  - Bash
  - Grep
  - Write
---

<objective>
Analyze the current git diff against the knowledge graph to identify changed components, affected downstream dependencies, architectural layers touched, and blast radius.
</objective>

<context>
Uses `.understand-anything/knowledge-graph.json` to understand what the changed files connect to, so you can assess risk and know what to review carefully.

If no knowledge graph exists, run `/rapidx:understand-anything` first.
</context>

<process>
1. Check `.understand-anything/knowledge-graph.json` exists
2. Get changed files: `git diff --name-only` (uncommitted) or `git diff main...HEAD --name-only` (branch)
3. Read project metadata (name, languages, frameworks) from the graph
4. Find graph nodes matching the changed file paths (filePath field)
5. Find 1-hop connected edges for each changed node (upstream callers + downstream dependencies)
6. Identify affected architectural layers from the layers section
7. Produce structured analysis:
   - **Changed Components**: directly modified (with node summaries)
   - **Affected Components**: 1-hop neighbors that may be impacted
   - **Affected Layers**: which architecture layers are touched
   - **Risk Assessment**: based on complexity values + blast radius count
8. Write diff overlay to `.understand-anything/diff-overlay.json`:
   ```json
   { "version":"1.0.0", "baseBranch":"<branch>", "generatedAt":"<ISO>",
     "changedFiles":["..."], "changedNodeIds":["..."], "affectedNodeIds":["..."] }
   ```
9. Tell user they can run `/rapidx:understand-anything-dashboard` to see the diff visually
</process>
