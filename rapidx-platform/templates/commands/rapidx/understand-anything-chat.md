---
name: rapidx:understand-anything-chat
description: "Ask questions about a codebase using its AI-generated knowledge graph"
argument-hint: "[query]"
allowed-tools:
  - Read
  - Bash
  - Grep
---

<objective>
Answer questions about this codebase by querying the knowledge graph at `.understand-anything/knowledge-graph.json`.
</objective>

<context>
The knowledge graph stores:
- `project` — name, description, languages, frameworks
- `nodes[]` — files, functions, classes, configs, docs, services, tables, endpoints (each has id, type, name, filePath, summary, tags, complexity)
- `edges[]` — imports, calls, depends_on, configures, documents, deploys, triggers (each has source, target, type, weight)
- `layers[]` — architectural groupings (id, name, description, nodeIds)
- `tour[]` — guided walkthrough steps

If no knowledge graph exists, tell the user to run `/rapidx:understand-anything` first.
</context>

<process>
1. Check `.understand-anything/knowledge-graph.json` exists — if not, instruct user to run `/rapidx:understand-anything`
2. Read only the `"project"` metadata section first (name, description, languages, frameworks)
3. Use Grep to search the graph JSON for the user's query: `$ARGUMENTS`
   - Search `"name"` fields for keyword matches
   - Search `"summary"` fields for semantic matches
   - Search `"tags"` arrays for topic matches
4. For matched node IDs, find connected edges (1-hop) to understand relationships
5. Identify which architectural layers the matched nodes belong to
6. Answer the query with: specific file/function references, layer context, relationship explanations
7. Be concise but thorough — link concepts to actual code locations
</process>
