'use strict';

/**
 * generate-commands.js
 *
 * Converts Get Things Done command files into equivalent formats for:
 *   - Claude Code /rapidx:* aliases
 *   - GitHub Copilot .prompt.md files (.github/prompts/)
 *   - Cursor MDC command files (.cursor/commands/rapidx/)
 *
 * Zero external dependencies — Node.js built-ins only.
 */

const fs = require('fs');
const path = require('path');

// ─── Parsers ──────────────────────────────────────────────────────────────────

/**
 * Parse a Get Things Done command file into its components.
 * @param {string} content — raw file content
 * @returns {{ name, description, argumentHint, allowedTools, objective, contextBlock, processBlock, raw }}
 */
function parseCommandFile(content) {
  // YAML frontmatter
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  const frontmatter = fmMatch ? fmMatch[1] : '';

  const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
  const descMatch = frontmatter.match(/^description:\s*(.+)$/m);
  const hintMatch = frontmatter.match(/^argument-hint:\s*(.+)$/m);
  const toolsMatch = frontmatter.match(/^allowed-tools:\n((?:[ \t]+-[ \t]+.+\n?)+)/m);

  const name = nameMatch ? nameMatch[1].trim() : '';
  const description = descMatch ? descMatch[1].trim() : '';
  const argumentHint = hintMatch ? hintMatch[1].trim().replace(/^["']|["']$/g, '') : '';
  const allowedTools = toolsMatch
    ? toolsMatch[1].split('\n').map(l => l.replace(/^\s*-\s*/, '').trim()).filter(Boolean)
    : [];

  // XML-style blocks
  const objectiveMatch = content.match(/<objective>([\s\S]*?)<\/objective>/);
  const contextMatch = content.match(/<context>([\s\S]*?)<\/context>/);
  const processMatch = content.match(/<process>([\s\S]*?)<\/process>/);

  return {
    name,
    description,
    argumentHint,
    allowedTools,
    objective: objectiveMatch ? objectiveMatch[1].trim() : description,
    contextBlock: contextMatch ? contextMatch[1].trim() : '',
    processBlock: processMatch ? processMatch[1].trim() : '',
    raw: content,
  };
}

/**
 * Extract the short command slug from a full command name.
 * "rapidx:new-project" → "new-project"
 */
function slug(commandName) {
  return commandName.replace(/^gsd:/, '').replace(/^rapidx:/, '');
}

/**
 * Title-case a slug for use in headings.
 * "plan-phase" → "Plan Phase"
 */
function titleCase(s) {
  return s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ─── Generators ───────────────────────────────────────────────────────────────

// Commands that already exist as native /rapidx: entries in templates/commands/rapidx/.
// When generateAllCommands() converts GTD source commands to /rapidx: aliases, it skips
// any name listed here to avoid creating a duplicate that shadows the hand-authored version.
// Update this list whenever a new command is added to templates/commands/rapidx/.
const NATIVE_RAPIDX_COMMANDS = new Set([
  'health', 'help', 'adr', 'audit-report', 'constitution', 'fine-tune',
  'knowledge-sync', 'learn', 'learn-arch', 'onboard-codebase', 'plan-spec',
  'plugin', 'tasks-from-spec', 'init-client', 'switch-client', 'add-tech',
  'governance-check', 'maturity-gate', 'spec', 'spec-review', 'do-mode2',
  'do-mode3', 'do-mode4',
]);

/**
 * Rewrite all legacy /gsd: command references in content to /rapidx:.
 * @param {string} text
 * @returns {string}
 */
function rewriteCommandRefs(text) {
  return text.replace(/\/gsd:/g, '/rapidx:');
}

/**
 * Generate a Claude Code /rapidx:* command from a parsed Get Things Done command.
 * All internal /gsd: cross-references are rewritten to /rapidx:.
 */
function toRapidxAlias(parsed) {
  const name = slug(parsed.name);
  const hintLine = parsed.argumentHint ? `\nargument-hint: ${parsed.argumentHint}` : '';
  const toolsBlock = parsed.allowedTools.length
    ? `\nallowed-tools:\n${parsed.allowedTools.map(t => `  - ${t}`).join('\n')}`
    : '';

  // Preserve all execution_context and context sections from original
  const execCtxMatch = parsed.raw.match(/<execution_context>([\s\S]*?)<\/execution_context>/);
  const execCtx = execCtxMatch
    ? `\n<execution_context>${rewriteCommandRefs(execCtxMatch[1])}</execution_context>\n`
    : '';

  const ctxBlock = parsed.contextBlock
    ? `\n<context>\n${rewriteCommandRefs(parsed.contextBlock)}\n</context>\n`
    : '';

  const fallbackProcess = `Execute the ${name} workflow from @~/.claude/commands/rapidx/${name}.md end-to-end.\nPreserve all workflow gates.`;

  return `---
name: rapidx:${name}
description: "[RapidX] ${parsed.description}"${hintLine}${toolsBlock}
---
<objective>
${rewriteCommandRefs(parsed.objective)}
</objective>
${execCtx}${ctxBlock}
<process>
${rewriteCommandRefs(parsed.processBlock) || fallbackProcess}
</process>
`;
}

// VS Code Copilot built-in tools available in agent mode.
// The `agent` field (not `mode`) controls execution — valid values: ask | agent | plan.
// See: https://code.visualstudio.com/docs/copilot/customization/prompt-files
const COPILOT_AGENT_TOOLS = [
  'codebase',
  'editFiles',
  'runCommands',
  'fetch',
  'problems',
  'search',
  'findTestFiles',
  'workspaceDetails',
];

/**
 * Generate a GitHub Copilot .prompt.md file from a parsed Get Things Done command.
 * Output filename: rapidx-<name>.prompt.md — placed in .github/prompts/
 * VS Code auto-discovers that folder; type /rapidx-<name> in Copilot Chat to invoke.
 *
 * Frontmatter uses the `agent` field per VS Code prompt file specification:
 * https://code.visualstudio.com/docs/copilot/customization/prompt-files
 */
function toCopilotPrompt(parsed) {
  const name = slug(parsed.name);
  const displayName = titleCase(name);
  const usageLine = parsed.argumentHint
    ? `\n**Usage:** \`${parsed.argumentHint}\`\n`
    : '';

  // Inline the process — strip @workflow references since Copilot can't resolve them
  const processText = rewriteCommandRefs(
    parsed.processBlock
      .replace(/@~\/\.claude\/get-things-done\/[^\s]+/g, '')
      .replace(/@~\/\.claude\/commands\/rapidx\/[^\s]+/g, '')
      .replace(/Execute the \S+ workflow from \S+ end-to-end\.?\n?/g, '')
      .trim()
  );

  const fallbackProcess = `Read \`.planning/\` state files to understand current project state.\nThen execute the "${name}" RapidX workflow: ${parsed.description.toLowerCase()}.`;

  const contextSection = parsed.contextBlock && !parsed.contextBlock.includes('$ARGUMENTS')
    ? `\n## Context\n\n${rewriteCommandRefs(parsed.contextBlock)}\n`
    : '';

  const toolsList = COPILOT_AGENT_TOOLS.map(t => `  - ${t}`).join('\n');

  return `---
agent: agent
description: "[RapidX] ${parsed.description}"
tools:
${toolsList}
---
# RapidX: ${displayName}
${usageLine}
## What this does

${parsed.objective}
${contextSection}
## Process

${processText || fallbackProcess}

---
*RapidX workflow command. Type \`/rapidx-${name}\` in Copilot Chat to invoke.*
`;
}

/**
 * Generate a Cursor MDC command file from a parsed Get Things Done command.
 * Placed in .cursor/commands/rapidx/<name>.md
 * Users reference with @.cursor/commands/rapidx/<name>.md in Composer.
 */
function toCursorCommand(parsed) {
  const name = slug(parsed.name);
  const usageLine = parsed.argumentHint
    ? `**Arguments:** \`${parsed.argumentHint}\``
    : '';

  // Strip @workflow file references — Cursor can't resolve ~/.claude paths
  const processText = rewriteCommandRefs(
    parsed.processBlock
      .replace(/@~\/\.claude\/get-things-done\/[^\s]+/g, '')
      .replace(/@~\/\.claude\/commands\/rapidx\/[^\s]+/g, '')
      .replace(/Execute the \S+ workflow from \S+ end-to-end\.?\n?/g, '')
      .trim()
  );

  const fallbackProcess = `Read \`.planning/\` state files to understand current project state.\nExecute the "${name}" workflow: ${parsed.description.toLowerCase()}.`;

  const contextSection = parsed.contextBlock && !parsed.contextBlock.includes('$ARGUMENTS')
    ? `\n## Context\n\n${rewriteCommandRefs(parsed.contextBlock)}\n`
    : '';

  return `---
description: "[RapidX] ${parsed.description}${parsed.argumentHint ? ' (' + parsed.argumentHint + ')' : ''}"
alwaysApply: false
---
# RapidX: ${titleCase(name)}

${usageLine}

## What this does

${parsed.objective}
${contextSection}
## Process

${processText || fallbackProcess}

## How to invoke

In Cursor Composer, type:
\`\`\`
@.cursor/commands/rapidx/${name}.md ${parsed.argumentHint || ''}
\`\`\`
Then describe what you want or provide the required arguments.
`;
}

// ─── Batch generator ──────────────────────────────────────────────────────────

/**
 * Convert all Get Things Done command files into Claude Code, Copilot, and Cursor formats.
 *
 * @param {string} commandsDir — directory containing source command .md files
 * @param {object} outputDirs
 * @param {string} [outputDirs.rapidx]  — Claude Code rapidx commands dir
 * @param {string} [outputDirs.copilot] — Copilot prompts dir
 * @param {string} [outputDirs.cursor]  — Cursor commands dir
 * @returns {{ generated: number, skipped: number, names: string[] }}
 */
function generateAllCommands(commandsDir, outputDirs) {
  if (!fs.existsSync(commandsDir)) {
    process.stderr.write(`[RapidX] Get Things Done commands source not found: ${commandsDir}\n`);
    return { generated: 0, skipped: 0, names: [] };
  }

  const files = fs.readdirSync(commandsDir)
    .filter(f => f.endsWith('.md'))
    .sort();

  let generated = 0;
  let skipped = 0;
  const names = [];

  for (const file of files) {
    const content = fs.readFileSync(path.join(commandsDir, file), 'utf8');
    const parsed = parseCommandFile(content);

    if (!parsed.name) {
      skipped++;
      continue;
    }

    const name = slug(parsed.name);

    // Skip commands that already exist as native /rapidx: entries
    if (NATIVE_RAPIDX_COMMANDS.has(name)) {
      skipped++;
      continue;
    }

    names.push(name);

    if (outputDirs.rapidx) {
      fs.mkdirSync(outputDirs.rapidx, { recursive: true });
      fs.writeFileSync(
        path.join(outputDirs.rapidx, file),
        toRapidxAlias(parsed),
        'utf8'
      );
    }

    if (outputDirs.copilot) {
      fs.mkdirSync(outputDirs.copilot, { recursive: true });
      // Prefix with rapidx- so every command is namespaced:
      // .github/prompts/rapidx-<name>.prompt.md → type /rapidx-<name> in Copilot Chat
      fs.writeFileSync(
        path.join(outputDirs.copilot, `rapidx-${name}.prompt.md`),
        toCopilotPrompt(parsed),
        'utf8'
      );
    }

    if (outputDirs.cursor) {
      fs.mkdirSync(outputDirs.cursor, { recursive: true });
      fs.writeFileSync(
        path.join(outputDirs.cursor, `${name}.md`),
        toCursorCommand(parsed),
        'utf8'
      );
    }

    generated++;
  }

  return { generated, skipped, names };
}

module.exports = {
  parseCommandFile,
  rewriteCommandRefs,
  toRapidxAlias,
  toCopilotPrompt,
  toCursorCommand,
  generateAllCommands,
};
