'use strict';

/**
 * generate-commands-index.js
 *
 * Generates COMMANDS.md — a human-readable index of all available GSD + RapidX
 * commands, with per-platform usage instructions.
 *
 * Also generates .github/copilot/prompts/gsd/index.prompt.md — a Copilot
 * prompt that lists all commands and routes to the right one.
 */

const fs = require('fs');
const path = require('path');
const { parseGsdCommand } = require('./generate-commands');

// Core GTD workflow commands — shown first in the index
const CORE_COMMANDS = [
  'new-project',
  'plan-phase',
  'execute-phase',
  'verify-work',
  'ship',
  'debug',
  'do',
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
        name: parsed.name.replace(/^gsd:/, ''),
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

  return `# Get Things Done — Command Reference

> Part of the RapidX Agentic Engineering Platform

## Core GTD workflow

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
Open a prompt file and click **Run**, or attach it with \`#file:\` in Copilot Chat:

\`\`\`
Open: .github/copilot/prompts/rapidx/new-project.prompt.md
Or: Ctrl+Shift+I → #file:.github/copilot/prompts/rapidx/plan-phase.prompt.md → describe phase
\`\`\`

All prompt files are in \`.github/copilot/prompts/rapidx/\`.

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
 * Generate a Copilot index prompt that lists and routes to all GSD commands.
 * @param {string} gsdSourceDir
 * @returns {string}
 */
function generateCopilotCommandsIndex(gsdSourceDir) {
  const commands = listCommands(gsdSourceDir);
  const list = commands
    .map(c => `- **${c.name}**${c.argumentHint ? ' `' + c.argumentHint + '`' : ''} — ${c.description}`)
    .join('\n');

  return `---
mode: agent
description: "[Get Things Done] List all available GTD commands and route to the right one"
---
# Get Things Done: Command Router

Tell me what you want to do and I'll run the right GTD command.

## Available commands

${list}

## What to do

Read the user's request, identify the best matching command from the list above, then execute it by following that command's workflow. Read \`.planning/\` state files to understand current project context.

If the user's intent maps to one specific command, execute it directly.
If it's ambiguous, ask one clarifying question to determine which command to use.
`;
}

/**
 * Write COMMANDS.md and the Copilot index prompt.
 * Called from install-claude.js and install-vscode.js after commands are generated.
 * @param {string} gsdSourceDir
 * @param {object} outputDirs
 * @param {string} [outputDirs.projectRoot]   — write COMMANDS.md here
 * @param {string} [outputDirs.copilotPrompts] — write index.prompt.md here
 */
function writeCommandsIndex(gsdSourceDir, outputDirs) {
  if (outputDirs.projectRoot) {
    const md = generateCommandsIndex(gsdSourceDir);
    fs.writeFileSync(path.join(outputDirs.projectRoot, 'COMMANDS.md'), md, 'utf8');
  }

  if (outputDirs.copilotPrompts) {
    fs.mkdirSync(outputDirs.copilotPrompts, { recursive: true });
    const prompt = generateCopilotCommandsIndex(gsdSourceDir);
    fs.writeFileSync(path.join(outputDirs.copilotPrompts, 'index.prompt.md'), prompt, 'utf8');
  }
}

module.exports = { writeCommandsIndex, generateCommandsIndex, generateCopilotCommandsIndex, listCommands };
