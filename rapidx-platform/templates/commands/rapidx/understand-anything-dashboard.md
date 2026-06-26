---
name: rapidx:understand-anything-dashboard
description: "Launch the interactive web dashboard to visualize the knowledge graph"
argument-hint: "[project-path]"
allowed-tools:
  - Bash
  - Read
---

<objective>
Start the Understand-Anything dashboard Vite server and provide the tokenized URL to access the interactive knowledge graph visualization.
</objective>

<context>
The dashboard is a Vite/React app in `~/.understand-anything-plugin/packages/dashboard/`. It reads the knowledge graph from the `GRAPH_DIR` environment variable. Access requires a token included in the server's output URL.

If no knowledge graph exists at `.understand-anything/knowledge-graph.json`, tell user to run `/rapidx:understand-anything` first.
</context>

<process>
1. Determine project directory from $ARGUMENTS or CWD
2. Check `.understand-anything/knowledge-graph.json` exists — if not, tell user to run `/rapidx:understand-anything`
3. Resolve plugin root:
   ```bash
   PLUGIN_ROOT="$HOME/.understand-anything-plugin"
   if [ ! -d "$PLUGIN_ROOT/packages/dashboard" ]; then
     echo "Error: Understand-Anything plugin not found at $PLUGIN_ROOT"
     echo "Run npx rapidx-platform to install, or see /rapidx:understand-anything for manual instructions"
     exit 1
   fi
   ```
4. Build core if needed:
   ```bash
   if [ ! -f "$PLUGIN_ROOT/packages/core/dist/index.js" ]; then
     cd "$PLUGIN_ROOT" && pnpm install && pnpm --filter @understand-anything/core build
   fi
   ```
5. Start the Vite server in the background:
   ```bash
   cd "$PLUGIN_ROOT/packages/dashboard" && GRAPH_DIR=<project-dir> npx vite --host 127.0.0.1 &
   ```
6. Capture the tokenized URL from server output — look for a line containing `Dashboard URL: http://127.0.0.1:<PORT>?token=<TOKEN>`
7. Report the full URL to the user **including the `?token=` parameter** — without it the dashboard shows an access gate
</process>
