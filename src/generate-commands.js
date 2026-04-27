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
 *
 * Supports two source formats:
 *   - Structured: uses <objective>, <context>, <process> XML blocks (most files)
 *   - Flat: plain markdown body without XML blocks (graphify, intel, workstreams, thread, etc.)
 *     For flat files the entire body (after frontmatter) becomes the processBlock.
 *
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
  // Also support inline allowed-tools: Read, Bash, ...
  const toolsInlineMatch = !toolsMatch && frontmatter.match(/^allowed-tools:\s*(.+)$/m);

  const name = nameMatch ? nameMatch[1].trim() : '';
  const description = descMatch ? descMatch[1].trim().replace(/^["']|["']$/g, '') : '';
  const argumentHint = hintMatch ? hintMatch[1].trim().replace(/^["']|["']$/g, '') : '';
  const allowedTools = toolsMatch
    ? toolsMatch[1].split('\n').map(l => l.replace(/^\s*-\s*/, '').trim()).filter(Boolean)
    : toolsInlineMatch
      ? toolsInlineMatch[1].split(',').map(t => t.trim()).filter(Boolean)
      : [];

  // XML-style blocks (structured format)
  const objectiveMatch = content.match(/<objective>([\s\S]*?)<\/objective>/);
  const contextMatch = content.match(/<context>([\s\S]*?)<\/context>/);
  const processMatch = content.match(/<process>([\s\S]*?)<\/process>/);

  // Flat format: no XML blocks — use full body after frontmatter as processBlock
  const hasXmlStructure = objectiveMatch || processMatch || contextMatch;
  const bodyContent = fmMatch ? content.slice(fmMatch[0].length).trim() : content.trim();

  return {
    name,
    description,
    argumentHint,
    allowedTools,
    objective: objectiveMatch ? objectiveMatch[1].trim() : description,
    contextBlock: contextMatch ? contextMatch[1].trim() : '',
    processBlock: processMatch
      ? processMatch[1].trim()
      : (hasXmlStructure ? '' : bodyContent),
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
 * Rewrite all legacy GSD branding and command references to RapidX equivalents.
 * Applied universally across all output platforms.
 * @param {string} text
 * @returns {string}
 */
function rewriteCommandRefs(text) {
  return text
    // Command refs — /gsd: and bare gsd: (without slash) in prose
    .replace(/\/gsd:/g, '/rapidx:')            // /gsd:plan-phase → /rapidx:plan-phase
    .replace(/\bgsd:(\S+)/g, 'rapidx:$1')      // gsd:discuss-phase → rapidx:discuss-phase (no slash)
    .replace(/`gsd-(\S+)`/g, '`rapidx-$1`')    // `gsd-discuss-phase` → `rapidx-discuss-phase`
    .replace(/gsd-tools/g, 'rapidx-tools')      // gsd-tools binary → rapidx-tools
    .replace(/gsd-user-files-backup/g, 'rapidx-user-files-backup') // update.md backup dir
    .replace(/\bgsd\/(?=[{a-zA-Z])/g, 'rapidx/')  // gsd/phase-{N}, gsd/{version} → rapidx/* branch names
    .replace(/prefixed with `gsd-`/g, 'prefixed with `rapidx-`') // update.md agent-prefix ref
    .replace(/\bappropriate gsd command/g, 'appropriate rapidx command') // progress.md
    // Directory paths
    .replace(/commands\/gsd\//g, 'commands/rapidx/')  // .claude/commands/gsd/ → .claude/commands/rapidx/
    .replace(/~\/\.gsd\//g, '~/.rapidx/')      // ~/.gsd/ (with trailing slash)
    .replace(/~\/\.gsd\b/g, '~/.rapidx')       // ~/.gsd (no trailing slash, e.g. mkdir -p ~/.gsd)
    // Agent type identifiers used in SDK queries
    .replace(/\bagent-skills gsd-/g, 'agent-skills rapidx-')  // gsd-advisor → rapidx-advisor
    // Environment variables — specific first, then catch-all for GSD_*
    .replace(/GSD > /g, 'RapidX > ')           // GSD > BANNER → RapidX > BANNER
    .replace(/GSD_WORKSTREAM/g, 'RAPIDX_WORKSTREAM')
    .replace(/\$\{GSD_WS\}/g, '${RAPIDX_WS}') // ${GSD_WS} braces form
    .replace(/\$GSD_WS\b/g, '$RAPIDX_WS')      // $GSD_WS bare form
    .replace(/\bGSD_([A-Z][A-Z0-9_]*)\b/g, 'RAPIDX_$1')  // GSD_CONFIG_PATH, GSD_SKIP_SCHEMA_CHECK, etc.
    // Prose branding — must come last (most general)
    .replace(/\bGSD\b/g, 'RapidX');            // standalone GSD → RapidX in prose
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

/**
 * Sanitize command body text for non-Claude-Code IDE output (Copilot, Cursor, etc.).
 * Removes or replaces Claude Code-specific syntax that doesn't translate to other tools.
 *
 * @param {string} text — process/context block content
 * @param {'copilot'|'cursor'} platform
 * @returns {string}
 */
function sanitizeForIde(text, platform) {
  let out = text;

  // Remove Claude Code "DO NOT READ THIS FILE" meta-instruction header
  out = out.replace(
    /\*\*STOP\s*--\s*DO NOT READ THIS FILE[^*]*\*\*\n*/g, ''
  );

  // Replace $ARGUMENTS variable with a usage note
  // Claude Code injects arguments here; for other IDEs the user includes them in their message
  out = out.replace(
    /\$ARGUMENTS/g,
    '[arguments from your message]'
  );

  // Helper: build a delegation note from a Task()/Agent() body string.
  // Supports both keyword-arg form (subagent_type="x") and object-literal form (subagent_type: "x").
  function delegationNote(body) {
    const typeMatch = body.match(/subagent_type\s*[=:]\s*["']([^"']+)["']/);
    const descMatch = body.match(/description\s*[=:]\s*["']([^"']+)["']/);
    const agentType = typeMatch ? typeMatch[1] : 'subagent';
    const desc = descMatch ? descMatch[1] : agentType;
    if (platform === 'copilot') {
      return `> **Delegate:** *${desc}* — attach \`#file:.github/agents/${agentType}.md\` to your Copilot Chat session with the prompt context above.`;
    }
    return `> **Delegate:** *${desc}* — reference \`@.cursor/agents/${agentType}.md\` in Cursor Composer with the prompt context above.`;
  }

  // Convert Task()/Agent() spawning calls to delegation instructions.
  //
  // Pass A — code blocks: replace any ``` block that contains an actual Task/Agent invocation.
  // Handles all formats: keyword-args (subagent_type="x"), object-literal ({subagent_type: "x"}),
  // params on same line, multi-line, and indented/blank-line forms.
  // A "real" invocation is detected by presence of subagent_type or prompt/description params.
  out = out.replace(
    /```[^\n]*\n([\s\S]*?)\n[ \t]*```/g,
    (match, body) => {
      if (!/(Task|Agent)\s*\(/.test(body)) return match;
      if (!/subagent_type\s*[=:]|prompt\s*[=:]["']|description\s*[=:]["']/.test(body)) return match;
      return delegationNote(body);
    }
  );

  // Pass B — bare prose: indented Task()/Agent() calls outside code fences.
  // Format: <indent>Task(\n  params...\n<indent>)  (supports both = and : param syntax)
  // Uses backreference to indent so it stops at the matching closing paren.
  out = out.replace(
    /^([ \t]+)(?:Task|Agent)\s*\(\n([\s\S]*?)^\1\)\s*$/gm,
    (match, _indent, body) => {
      if (!/(?:subagent_type|description|prompt)\s*[=:]/.test(body)) return match;
      return delegationNote(body);
    }
  );

  // Remove Skill() invocations (Claude Code-only) — replace with a note.
  // Handles positional Skill("name") and named-param Skill(skill="name", args="...").
  // Strips gsd:, rapidx:, or gsd- prefix from the skill name.
  out = out.replace(
    /Skill\(([^)]+)\)/g,
    (match, args) => {
      const namedMatch = args.match(/skill\s*=\s*["']([^"']+)["']/);
      const positionalMatch = args.match(/^\s*["']([^"']+)["']/);
      const rawName = namedMatch ? namedMatch[1] : (positionalMatch ? positionalMatch[1] : args.trim());
      const name = rawName.replace(/^(?:gsd|rapidx)[:-]/, '');
      return `[invoke the \`${name}\` workflow step]`;
    }
  );

  return out.trim();
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
 * Convert @~/.claude/get-things-done/ file references to #file: workspace-relative paths.
 * The GTD support files are copied to .github/prompts/rapidx/ during VS Code installation,
 * so Copilot can resolve them via the standard #file: syntax.
 *
 * @param {string} text
 * @returns {string}
 */
function convertGtdRefsToCopilot(text) {
  return text.replace(
    /@~\/\.claude\/get-things-done\/([\w\-./]+)/g,
    '#file:.github/prompts/rapidx/$1'
  );
}

/**
 * Generate a GitHub Copilot .prompt.md file from a parsed Get Things Done command.
 * Output filename: rapidx-<name>.prompt.md — placed in .github/prompts/
 * VS Code auto-discovers that folder; type /rapidx-<name> in Copilot Chat to invoke.
 *
 * Frontmatter uses the `agent` field per VS Code prompt file specification:
 * https://code.visualstudio.com/docs/copilot/customization/prompt-files
 *
 * @~/.claude/get-things-done/ references are converted to #file:.github/prompts/rapidx/
 * paths (copied there by install-vscode.js) so Copilot can read them directly.
 */
function toCopilotPrompt(parsed) {
  const name = slug(parsed.name);
  const displayName = titleCase(name);
  const usageLine = parsed.argumentHint
    ? `\n**Usage:** \`${parsed.argumentHint}\`\n`
    : '';

  // Build #file: references from <execution_context> — these are the workflow/reference/template
  // files that Claude Code resolves via @~/.claude/ syntax. For Copilot, they're copied to
  // .github/prompts/rapidx/ and referenced with #file:.
  const execCtxMatch = parsed.raw.match(/<execution_context>([\s\S]*?)<\/execution_context>/);
  const filesSection = execCtxMatch
    ? `\n## Workflow files\n\n${convertGtdRefsToCopilot(rewriteCommandRefs(execCtxMatch[1].trim()))}\n`
    : '';

  // Process block: sanitize for Copilot, convert @refs, rewrite command refs
  const rawProcess = rewriteCommandRefs(
    sanitizeForIde(
      convertGtdRefsToCopilot(parsed.processBlock)
        .replace(
          /Execute the (\S+) workflow from (#file:\S+) end-to-end\.?/g,
          'Execute the workflow defined in $2 end-to-end.'
        )
        .replace(/@~\/\.claude\/commands\/rapidx\/[^\s]+/g, ''),
      'copilot'
    )
  );

  const fallbackProcess = `Read \`.planning/\` state files to understand current project state.\nThen execute the "${name}" RapidX workflow: ${parsed.description.toLowerCase()}.`;

  const contextSection = parsed.contextBlock
    ? `\n## Context\n\n${sanitizeForIde(rewriteCommandRefs(parsed.contextBlock), 'copilot')}\n`
    : '';

  const toolsList = COPILOT_AGENT_TOOLS.map(t => `  - ${t}`).join('\n');

  return `---
agent: agent
description: "[RapidX] ${rewriteCommandRefs(parsed.description)}"
tools:
${toolsList}
---
# RapidX: ${displayName}
${usageLine}
## What this does

${rewriteCommandRefs(sanitizeForIde(parsed.objective, 'copilot'))}
${contextSection}${filesSection}
## Process

${rawProcess || fallbackProcess}

---
*RapidX workflow command. Type \`/rapidx-${name}\` in Copilot Chat to invoke.*
`;
}

/**
 * Resolve @~/.claude/get-things-done/X/Y.md refs to actual file content from gtdDir.
 * Returns a map of { refPath → fileContent } for all refs found in text.
 * @param {string} text — raw content containing @~/.claude/ refs
 * @param {string} gtdDir — path to the get-things-done/ source directory
 * @returns {Map<string, string>}
 */
function resolveGtdRefs(text, gtdDir) {
  const resolved = new Map();
  if (!gtdDir || !fs.existsSync(gtdDir)) return resolved;
  const matches = text.matchAll(/@~\/\.claude\/get-things-done\/([\w\-./]+)/g);
  for (const m of matches) {
    const rel = m[1];
    const fullPath = path.join(gtdDir, rel);
    if (!resolved.has(rel) && fs.existsSync(fullPath)) {
      resolved.set(rel, fs.readFileSync(fullPath, 'utf8'));
    }
  }
  return resolved;
}

/**
 * Generate a Cursor MDC command file from a parsed Get Things Done command.
 * Placed in .cursor/commands/rapidx/<name>.md
 * Users reference with @.cursor/commands/rapidx/<name>.md in Composer.
 *
 * When gtdDir is provided, primary workflow file content is inlined directly
 * so the command file is fully self-contained — Cursor cannot auto-resolve
 * nested @ references inside a file that was itself @-referenced.
 *
 * @param {object} parsed — from parseCommandFile
 * @param {object} [opts]
 * @param {string} [opts.gtdDir] — path to get-things-done/ for workflow inlining
 */
function toCursorCommand(parsed, opts) {
  const gtdDir = opts && opts.gtdDir;
  const name = slug(parsed.name);
  const usageLine = parsed.argumentHint
    ? `**Arguments:** \`${parsed.argumentHint}\``
    : '';

  // Resolve and inline @~/.claude/get-things-done/ references from execution_context
  const execCtxMatch = parsed.raw.match(/<execution_context>([\s\S]*?)<\/execution_context>/);
  const execRefs = execCtxMatch ? resolveGtdRefs(execCtxMatch[1], gtdDir) : new Map();

  // Build inlined workflow sections (primary workflow only to keep file size manageable)
  let inlinedWorkflow = '';
  if (execRefs.size > 0 && gtdDir) {
    // First ref is the primary workflow; inline it fully — self-contained for Cursor.
    // Remaining refs are listed so the user can explicitly @-reference them if needed.
    const entries = Array.from(execRefs.entries());
    const [primaryRel, primaryContent] = entries[0];
    const primaryName = path.basename(primaryRel, '.md');

    // Sanitize the inlined workflow: convert @~/.claude/ refs, rewrite command refs,
    // apply IDE sanitization ($ARGUMENTS, Task() spawning, DO NOT READ header).
    const sanitizedWorkflow = sanitizeForIde(
      rewriteCommandRefs(
        primaryContent
          .replace(/@~\/\.claude\/get-things-done\/([\w\-./]+)/g, '.cursor/rapidx/$1')
          .replace(/@~\/\.claude\/commands\/rapidx\/[^\s]+/g, '')
      ),
      'cursor'
    );

    inlinedWorkflow = `\n## Workflow: ${primaryName}\n\n${sanitizedWorkflow}\n`;

    if (entries.length > 1) {
      const others = entries.slice(1).map(([rel]) =>
        `- \`.cursor/rapidx/${rel}\` — add \`@${rel}\` to your Composer message for additional context`
      ).join('\n');
      inlinedWorkflow += `\n### Additional context files (reference explicitly if needed)\n\n${others}\n`;
    }
  }

  // Process block — for commands with a thin process stub, the workflow is inlined above.
  // For flat/self-contained commands the processBlock IS the full content.
  const processText = rewriteCommandRefs(
    sanitizeForIde(
      parsed.processBlock
        .replace(/@~\/\.claude\/get-things-done\/[^\s]+/g, '')
        .replace(/Execute the \S+ workflow from\s+end-to-end\.?/g, '')
        .replace(/@~\/\.claude\/commands\/rapidx\/[^\s]+/g, '')
        .trim(),
      'cursor'
    )
  );

  const fallbackProcess = `Read \`.planning/\` state files to understand current project state.\nExecute the "${name}" workflow: ${parsed.description.toLowerCase()}.`;

  const contextSection = parsed.contextBlock
    ? `\n## Context\n\n${sanitizeForIde(rewriteCommandRefs(parsed.contextBlock), 'cursor')}\n`
    : '';

  const cleanDesc = rewriteCommandRefs(parsed.description);
  const cleanObjective = rewriteCommandRefs(sanitizeForIde(parsed.objective, 'cursor'));

  // For commands with inlined workflow, process stub is redundant — skip it
  const showProcess = !inlinedWorkflow || processText;

  return `---
description: "[RapidX] ${cleanDesc}${parsed.argumentHint ? ' (' + parsed.argumentHint + ')' : ''}"
alwaysApply: false
---
# RapidX: ${titleCase(name)}

${usageLine}

## What this does

${cleanObjective}
${contextSection}${inlinedWorkflow}${showProcess ? `\n## Process\n\n${processText || fallbackProcess}\n` : ''}
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
 * @param {object} [opts]
 * @param {string} [opts.gtdDir] — get-things-done/ root, enables workflow inlining in Cursor output
 * @returns {{ generated: number, skipped: number, names: string[] }}
 */
function generateAllCommands(commandsDir, outputDirs, opts) {
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
        toCursorCommand(parsed, opts),
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
  convertGtdRefsToCopilot,
  toRapidxAlias,
  toCopilotPrompt,
  toCursorCommand,
  generateAllCommands,
};
