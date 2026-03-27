'use strict';

/**
 * generate-commands.js
 *
 * Converts GSD Claude Code command files into equivalent formats for:
 *   - Claude Code /rapidx:* aliases
 *   - GitHub Copilot .prompt.md files (.github/copilot/prompts/rapidx/)
 *   - Cursor MDC command files (.cursor/commands/rapidx/)
 *
 * Zero external dependencies — Node.js built-ins only.
 */

const fs = require('fs');
const path = require('path');

// ─── Parsers ──────────────────────────────────────────────────────────────────

/**
 * Parse a GSD Claude Code command markdown file into its components.
 * @param {string} content — raw file content
 * @returns {{ name, description, argumentHint, allowedTools, objective, contextBlock, processBlock, raw }}
 */
function parseGsdCommand(content) {
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
 * Extract the short command slug from a full GSD command name.
 * "gsd:new-project" → "new-project"
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

// Commands that already exist as native /rapidx: entries — skip alias generation to avoid conflicts
const NATIVE_RAPIDX_COMMANDS = new Set(['health', 'help']);

/**
 * Generate a Claude Code /rapidx:* alias from a parsed GSD command.
 * Preserves the original workflow references — just moves to rapidx: namespace.
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
    ? `\n<execution_context>${execCtxMatch[1]}</execution_context>\n`
    : '';

  const ctxBlock = parsed.contextBlock
    ? `\n<context>\n${parsed.contextBlock}\n</context>\n`
    : '';

  const fallbackProcess = `Execute the ${name} workflow from @~/.claude/get-things-done/workflows/${name}.md end-to-end.\nPreserve all workflow gates.`;

  return `---
name: rapidx:${name}
description: "[Get Things Done] ${parsed.description}"${hintLine}${toolsBlock}
---
<objective>
${parsed.objective}
</objective>
${execCtx}${ctxBlock}
<process>
${parsed.processBlock || fallbackProcess}
</process>
`;
}

/**
 * Generate a GitHub Copilot .prompt.md file from a parsed GSD command.
 * Placed in .github/copilot/prompts/rapidx/<name>.prompt.md
 * Users open in VS Code and click "Run in Copilot Chat".
 */
function toCopilotPrompt(parsed) {
  const name = slug(parsed.name);
  const usageLine = parsed.argumentHint
    ? `\n**Usage:** \`${parsed.argumentHint}\`\n`
    : '';

  // Inline the process — strip @workflow references since Copilot can't resolve them
  const processText = parsed.processBlock
    .replace(/@~\/\.claude\/get-things-done\/[^\s]+/g, '')
    .replace(/Execute the \S+ workflow from \S+ end-to-end\.?\n?/g, '')
    .trim();

  const fallbackProcess = `Read \`.planning/\` state files to understand current project state.\nThen execute the "${name}" workflow: ${parsed.description.toLowerCase()}.`;

  const contextSection = parsed.contextBlock && !parsed.contextBlock.includes('$ARGUMENTS')
    ? `\n## Context\n\n${parsed.contextBlock}\n`
    : '';

  return `---
mode: agent
description: "[Get Things Done] ${parsed.description}"
---
# Get Things Done: ${titleCase(name)}
${usageLine}
## What this does

${parsed.objective}
${contextSection}
## Process

${processText || fallbackProcess}

---
*RapidX GSD command — part of the Get Things Done workflow engine.*
`;
}

/**
 * Generate a Cursor MDC command file from a parsed GSD command.
 * Placed in .cursor/commands/rapidx/<name>.md
 * Users reference with @.cursor/commands/rapidx/<name>.md in Composer.
 */
function toCursorCommand(parsed) {
  const name = slug(parsed.name);
  const usageLine = parsed.argumentHint
    ? `**Arguments:** \`${parsed.argumentHint}\``
    : '';

  // Strip @workflow file references — Cursor can't resolve ~/.claude paths
  const processText = parsed.processBlock
    .replace(/@~\/\.claude\/get-things-done\/[^\s]+/g, '')
    .replace(/Execute the \S+ workflow from \S+ end-to-end\.?\n?/g, '')
    .trim();

  const fallbackProcess = `Read \`.planning/\` state files to understand current project state.\nExecute the "${name}" workflow: ${parsed.description.toLowerCase()}.`;

  const contextSection = parsed.contextBlock && !parsed.contextBlock.includes('$ARGUMENTS')
    ? `\n## Context\n\n${parsed.contextBlock}\n`
    : '';

  return `---
description: "[Get Things Done] ${parsed.description}${parsed.argumentHint ? ' (' + parsed.argumentHint + ')' : ''}"
alwaysApply: false
---
# Get Things Done: ${titleCase(name)}

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
 * Convert all GSD command files into Claude Code, Copilot, and Cursor formats.
 *
 * @param {string} gsdSourceDir — directory containing source gsd/*.md files
 * @param {object} outputDirs
 * @param {string} [outputDirs.rapidx]  — Claude Code rapidx commands dir
 * @param {string} [outputDirs.copilot] — Copilot prompts dir
 * @param {string} [outputDirs.cursor]  — Cursor commands dir
 * @returns {{ generated: number, skipped: number, names: string[] }}
 */
function generateAllCommands(gsdSourceDir, outputDirs) {
  if (!fs.existsSync(gsdSourceDir)) {
    process.stderr.write(`[RapidX] GSD commands source not found: ${gsdSourceDir}\n`);
    return { generated: 0, skipped: 0, names: [] };
  }

  const files = fs.readdirSync(gsdSourceDir)
    .filter(f => f.endsWith('.md'))
    .sort();

  let generated = 0;
  let skipped = 0;
  const names = [];

  for (const file of files) {
    const content = fs.readFileSync(path.join(gsdSourceDir, file), 'utf8');
    const parsed = parseGsdCommand(content);

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
      fs.writeFileSync(
        path.join(outputDirs.copilot, `${name}.prompt.md`),
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
  parseGsdCommand,
  toRapidxAlias,
  toCopilotPrompt,
  toCursorCommand,
  generateAllCommands,
};
