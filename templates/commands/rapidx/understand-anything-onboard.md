---
name: rapidx:understand-anything-onboard
description: "Generate a comprehensive onboarding guide for new team members from the knowledge graph"
allowed-tools:
  - Read
  - Write
  - Bash
  - Grep
---

<objective>
Generate a comprehensive, structured onboarding guide from the project's knowledge graph to help new developers understand the codebase quickly.
</objective>

<context>
Produces a markdown onboarding document with: project overview, architecture layers, key concepts, guided tour, file map, and complexity hotspots.

If no knowledge graph exists, run `/rapidx:understand-anything` first.
</context>

<process>
1. Check `.understand-anything/knowledge-graph.json` exists
2. Read project metadata (name, languages, frameworks, description)
3. Read the `layers` array (architecture definition)
4. Read the `tour` array (guided walkthrough steps)
5. Find all file-level nodes (types: file, config, document, service, pipeline, table, schema, resource, endpoint) — skip function/class nodes for high-level guide
6. Identify complexity hotspots (nodes with highest complexity values)
7. Generate onboarding guide with sections:
   - **Project Overview**: tech stack, purpose, key frameworks
   - **Architecture Layers**: each layer's name, description, key files
   - **Key Concepts**: important patterns from node summaries/tags
   - **Guided Tour**: step-by-step learning path from tour steps
   - **File Map**: what each key file does, organized by layer
   - **Complexity Hotspots**: areas to approach carefully with context
8. Format as clean markdown
9. Ask user if they want to save to `docs/ONBOARDING.md`
10. If yes, write the file and suggest committing to repo
</process>
