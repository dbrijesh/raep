---
name: rapidx:plugin
description: "Install, list, and manage RapidX plugins — curated bundles of agents, skills, and workflows"
allowed-tools:
  - Read
  - Write
  - Bash
---

<objective>
Manage RapidX plugins — curated bundles of agents + skills + instructions + hooks for specific workflows, frameworks, or compliance domains.

Usage:
  /rapidx:plugin list                        → Show all available plugins
  /rapidx:plugin install <name>              → Install a plugin
  /rapidx:plugin install <name> --all-platforms → Install for all configured platforms
  /rapidx:plugin remove <name>              → Remove a plugin
  /rapidx:plugin info <name>                → Show plugin details
</objective>

<process>
## Detect mode from $ARGUMENTS

### Mode: list (no arguments or "list")

Display all available plugins:

```
RapidX Plugin Catalog

  SDLC Workflow Plugins:
    sdd-workflow@1.0.0         Spec-Driven Development full workflow bundle
    knowledge-engine@1.0.0     Codebase learning and fine-tuning system
    full-sdlc@1.0.0            Complete SDLC: SDD + knowledge + governance

  Governance Plugins:
    enterprise-governance@1.0.0  Enterprise governance, compliance, audit trail

  Stack-Specific Plugins:
    frontend-react@1.0.0       React + TypeScript development bundle
    python-fastapi@1.0.0       Python + FastAPI backend bundle

  CI/CD Plugins:
    github-actions-sdlc@1.0.0  AI-powered GitHub Actions workflows

  [installed] = currently installed in this project

  Install: /rapidx:plugin install <name>
```

### Mode: install <name>

1. Locate plugin definition (built-in catalog or `.rapidx/plugins/registry.json`)
2. Check stack compatibility (if plugin has `stackRequires`)
3. Show installation plan:
   ```
   Installing plugin: {name}@{version}

     Adds skills: {list}
     Adds agents: {list}
     Adds commands: {list}
     Adds hooks: {list}
     Adds workflows: {list}

     Proceed? [Y/n]
   ```
4. Copy components to installed locations
5. Update `.rapidx/plugins/installed.json`
6. Run `/rapidx:knowledge-sync` to propagate to all platforms
7. Output:

```
Plugin installed: {name}@{version}

  Components added:
    Skills:    {list}
    Agents:    {list}
    Commands:  {list}
    Hooks:     {list}

  Run /rapidx:help to see updated command list.
```

### Mode: remove <name>

1. Read `.rapidx/plugins/installed.json`
2. Confirm removal (destructive operation)
3. Remove plugin record from installed.json
4. Output cleanup instructions (components to manually remove if needed)

### Mode: info <name>

Display full plugin details:
- Description
- Version
- Components included (skills, agents, commands, hooks)
- Platform support
- Stack requirements
- Installation status

### Creating custom plugins

To create a custom plugin for your team:

1. Create `rapidx-plugin.json` manifest:
```json
{
  "name": "my-team-standards",
  "version": "1.0.0",
  "description": "My team's coding standards and agents",
  "author": "My Team",
  "platforms": ["claude", "vscode", "cursor"],
  "components": {
    "skills": ["my-skill"],
    "agents": ["my-agent"],
    "commands": ["my-command"],
    "hooks": []
  }
}
```

2. Add components in `agents/`, `skills/`, `commands/` subdirectories
3. Register: add to `.rapidx/plugins/registry.json`
4. Install: `/rapidx:plugin install my-team-standards`
</process>
