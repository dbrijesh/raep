---
name: rapidx:understand-anything-explain
description: "Deep-dive explanation of a specific file, function, or module using the knowledge graph"
argument-hint: "[file-path or file-path:FunctionName]"
allowed-tools:
  - Read
  - Bash
  - Grep
---

<objective>
Provide a thorough, in-context explanation of a specific code component using the knowledge graph and source code together.
</objective>

<context>
Combines knowledge graph context (architecture layer, relationships, summary) with actual source code reading to produce a richer explanation than reading the code alone.

Accepts: `src/auth/login.ts` (file), `src/auth/login.ts:verifyToken` (specific function).

If no knowledge graph exists, run `/rapidx:understand-anything` first.
</context>

<process>
1. Check `.understand-anything/knowledge-graph.json` exists
2. Find the target node from `$ARGUMENTS`:
   - For a file path: search `"filePath"` in the graph
   - For `path:function`: search `"name"` filtered by file path
3. Get all connected edges (both directions) for the node — outgoing (calls/imports) and incoming (callers/importers)
4. Read connected node names and summaries (1-hop neighborhood)
5. Identify the node's architectural layer
6. Read the actual source file for deep analysis
7. Explain the component:
   - **Role in architecture** (which layer, why it exists)
   - **Internal structure** (functions, classes it contains — from `contains` edges)
   - **External connections** (what it imports, what calls it — from edges)
   - **Data flow** (inputs → processing → outputs — from source code)
   - **Patterns and complexity** (any non-obvious idioms or design patterns)
</process>
