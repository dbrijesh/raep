'use strict';

/**
 * generate-commands-index.js
 *
 * Generates COMMANDS.md — a human-readable index of all available RapidX
 * commands, with per-platform usage instructions.
 *
 * Also generates .github/prompts/rapidx-gtd.prompt.md — a VS Code Copilot
 * prompt router. Users type /rapidx-gtd in Copilot Chat to invoke it.
 */

const fs = require('fs');
const path = require('path');
const { parseGsdCommand } = require('./generate-commands');

// Core workflow commands — shown first in the index
const CORE_COMMANDS = [
  'do',
  'do-mode2',
  'do-mode3',
  'do-mode4',
  'new-project',
  'plan-phase',
  'execute-phase',
  'verify-work',
  'ship',
  'debug',
  'next',
  'review',
  'progress',
];

/**
 * Build a sorted command list with descriptions from source .md files.
 * @param {string} gsdSourceDir
 * @returns {{ name: string, description: string, argumentHint: string }[]}
 */
function listCommands(gsdSourceDir) {
  if (!fs.existsSync(gsdSourceDir)) return [];

  return fs.readdirSync(gsdSourceDir)
    .filter(f => f.endsWith('.md'))
    .sort()
    .map(file => {
      const content = fs.readFileSync(path.join(gsdSourceDir, file), 'utf8');
      const parsed = parseGsdCommand(content);
      return {
        name: parsed.name.replace(/^gsd:/, '').replace(/^rapidx:/, ''),
        description: parsed.description,
        argumentHint: parsed.argumentHint,
      };
    })
    .filter(c => c.name);
}

/**
 * Generate COMMANDS.md content listing all available commands per platform.
 * @param {string} gsdSourceDir
 * @returns {string}
 */
function generateCommandsIndex(gsdSourceDir) {
  const commands = listCommands(gsdSourceDir);

  const coreRows = [];
  const otherRows = [];

  for (const cmd of commands) {
    const hint = cmd.argumentHint ? ` \`${cmd.argumentHint}\`` : '';
    const row = `| \`${cmd.name}\` | ${cmd.description}${hint} |`;
    if (CORE_COMMANDS.includes(cmd.name)) {
      coreRows.push(row);
    } else {
      otherRows.push(row);
    }
  }

  // Sort core rows by CORE_COMMANDS order
  coreRows.sort((a, b) => {
    const aName = a.match(/`([^`]+)`/)[1];
    const bName = b.match(/`([^`]+)`/)[1];
    return CORE_COMMANDS.indexOf(aName) - CORE_COMMANDS.indexOf(bName);
  });

  return `# RapidX — Command Reference

> RapidX Agentic Engineering Platform

## Execution modes — choose your autonomy level

| Mode | Command | Autonomy | When to use |
|------|---------|----------|-------------|
| **1** | \`do <task>\` | Dispatcher | Not sure which command — routes automatically |
| **2** | \`do-mode2 <task>\` | Human-driven | Approve every gate: plan → diffs → commit |
| **3** | \`do-mode3 <task>\` | Orchestrated | Agents run parallel waves, you review per wave |
| **4** | \`do-mode4 <task>\` | Autonomous | Full autopilot, no checkpoints, audit log written |

## Core workflow

| Command | Description |
|---------|-------------|
${coreRows.join('\n')}

## All commands

| Command | Description |
|---------|-------------|
${[...coreRows, ...otherRows].join('\n')}

---

## How to use per platform

### Claude Code
Use \`/rapidx:<command>\` in the chat prompt. \`/gsd:<command>\` also works for backward compatibility.

\`\`\`
/rapidx:new-project
/rapidx:plan-phase 2
/rapidx:execute-phase 2 --wave 1
/rapidx:verify-work 2
/rapidx:ship 2
/rapidx:debug login fails with 401
/rapidx:do describe what you want in plain text
\`\`\`

### GitHub Copilot (VS Code)
Type \`/rapidx-<command>\` in Copilot Chat — prompts are auto-discovered from \`.github/prompts/\`.
Or open any \`.prompt.md\` file and click **Run in Copilot Chat**:

\`\`\`
/rapidx-new-project
/rapidx-plan-phase    then describe the phase
/rapidx-fine-tune     apply codebase knowledge to all AI platforms
/rapidx-learn         learn patterns from your codebase
/rapidx-gtd           command router — describe what you want

Open file:  .github/prompts/rapidx-new-project.prompt.md  → click "Run"
\`\`\`

All prompt files are in \`.github/prompts/\` and follow the VS Code prompt file standard.
See: https://code.visualstudio.com/docs/copilot/customization/prompt-files

### Cursor
Reference a command file with \`@\` in Composer:

\`\`\`
@.cursor/commands/rapidx/new-project.md
@.cursor/commands/rapidx/execute-phase.md 2 --wave 1
@.cursor/commands/rapidx/debug.md login fails with 401
\`\`\`

All command files are in \`.cursor/commands/rapidx/\`.
`;
}

/**
 * Generate a Copilot command router prompt (rapidx-gtd.prompt.md).
 * Follows VS Code prompt file standard — `agent` field, not `mode`.
 * https://code.visualstudio.com/docs/copilot/customization/prompt-files
 * @param {string} gsdSourceDir
 * @returns {string}
 */
function generateCopilotCommandsIndex(gsdSourceDir) {
  const commands = listCommands(gsdSourceDir);
  const list = commands
    .map(c => `- **\`/rapidx-${c.name}\`**${c.argumentHint ? ' `' + c.argumentHint + '`' : ''} — ${c.description}`)
    .join('\n');

  return `---
agent: agent
description: "[RapidX] Command router — describe what you want and I'll run the right RapidX workflow"
tools:
  - codebase
  - editFiles
  - runCommands
  - problems
  - search
  - workspaceDetails
---
# RapidX: Command Router

Tell me what you want to do and I'll run the right RapidX workflow.

## Available commands

Type \`/rapidx-<name>\` in Copilot Chat to invoke any of these directly:

${list}

## What to do

Read the user's request, identify the best matching command from the list above, then execute it by following that command's workflow. Read \`.planning/\` state files to understand current project context.

- If the user's intent maps to one specific command, execute it directly.
- If it's ambiguous, ask one clarifying question to determine which command to use.
- For enterprise/governance tasks, prefer \`/rapidx-governance-check\`, \`/rapidx-maturity-gate\`, or \`/rapidx-audit-report\`.

*Type \`/rapidx-gtd\` in Copilot Chat to see this router.*
`;
}

/**
 * Write COMMANDS.md and the Copilot index prompt.
 * Called from install-claude.js and install-vscode.js after commands are generated.
 * @param {string} gsdSourceDir
 * @param {object} outputDirs
 * @param {string} [outputDirs.projectRoot]   — write COMMANDS.md here
 * @param {string} [outputDirs.copilotPrompts] — write rapidx-gtd.prompt.md here
 */
function writeCommandsIndex(gsdSourceDir, outputDirs) {
  if (outputDirs.projectRoot) {
    const md = generateCommandsIndex(gsdSourceDir);
    fs.writeFileSync(path.join(outputDirs.projectRoot, 'COMMANDS.md'), md, 'utf8');
  }

  if (outputDirs.copilotPrompts) {
    fs.mkdirSync(outputDirs.copilotPrompts, { recursive: true });
    const prompt = generateCopilotCommandsIndex(gsdSourceDir);
    // Named "rapidx-gtd" — users type /rapidx-gtd in Copilot Chat for the command router
    fs.writeFileSync(path.join(outputDirs.copilotPrompts, 'rapidx-gtd.prompt.md'), prompt, 'utf8');
  }
}

module.exports = { writeCommandsIndex, generateCommandsIndex, generateCopilotCommandsIndex, listCommands };
