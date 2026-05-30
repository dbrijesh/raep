'use strict';

const assert = require('assert');
const {
  parseCommandFile,
  toRapidxAlias,
  toCopilotPrompt,
  toCursorCommand,
} = require('../../src/generate-commands');

// ─── Fixtures ─────────────────────────────────────────────────────────────────

// Source command files use the legacy gsd: prefix — the parser strips it when converting.
const NEW_PROJECT = `---
name: gsd:new-project
description: Initialize a new project with deep context gathering and PROJECT.md
argument-hint: "[--auto]"
allowed-tools:
  - Read
  - Bash
  - Write
  - Task
  - AskUserQuestion
---
<context>
**Flags:**
- \`--auto\` — Automatic mode.
</context>

<objective>
Initialize a new project through unified flow: questioning → research → requirements → roadmap.
</objective>

<execution_context>
@~/.claude/get-things-done/workflows/new-project.md
</execution_context>

<process>
Execute the new-project workflow from @~/.claude/get-things-done/workflows/new-project.md end-to-end.
Preserve all workflow gates.
</process>
`;

const NO_HINT = `---
name: gsd:next
description: Automatically advance to the next logical step
allowed-tools:
  - Read
  - Bash
---
<objective>
Detect the current project state and invoke the next logical workflow step.
</objective>

<process>
Execute the next workflow from @~/.claude/get-things-done/workflows/next.md end-to-end.
</process>
`;

const NO_FRONTMATTER = `# Some doc without frontmatter`;

// ─── Tests ────────────────────────────────────────────────────────────────────

// parseCommandFile — full command
{
  const parsed = parseCommandFile(NEW_PROJECT);
  assert.strictEqual(parsed.name, 'gsd:new-project');
  assert.strictEqual(parsed.description, 'Initialize a new project with deep context gathering and PROJECT.md');
  assert.strictEqual(parsed.argumentHint, '[--auto]');
  assert.deepStrictEqual(parsed.allowedTools, ['Read', 'Bash', 'Write', 'Task', 'AskUserQuestion']);
  assert.ok(parsed.objective.includes('Initialize a new project'));
  assert.ok(parsed.contextBlock.includes('--auto'));
  console.log('✓ parseCommandFile — full command');
}

// parseCommandFile — no argument-hint
{
  const parsed = parseCommandFile(NO_HINT);
  assert.strictEqual(parsed.name, 'gsd:next');
  assert.strictEqual(parsed.argumentHint, '');
  console.log('✓ parseCommandFile — no argument-hint');
}

// parseCommandFile — no frontmatter returns empty name
{
  const parsed = parseCommandFile(NO_FRONTMATTER);
  assert.strictEqual(parsed.name, '');
  console.log('✓ parseCommandFile — no frontmatter → empty name');
}

// toRapidxAlias — name conversion (no gsd- infix)
{
  const parsed = parseCommandFile(NEW_PROJECT);
  const out = toRapidxAlias(parsed);
  assert.ok(out.includes('name: rapidx:new-project'), 'should be rapidx:new-project (no gsd- infix)');
  assert.ok(!out.includes('name: rapidx:gsd-'), 'should NOT have gsd- infix');
  assert.ok(out.includes('[RapidX]'), 'description should have RapidX prefix');
  assert.ok(out.includes('argument-hint:'), 'should preserve argument-hint');
  assert.ok(out.includes('allowed-tools:'), 'should preserve allowed-tools');
  assert.ok(!out.includes('name: gsd:'), 'should not contain original gsd: name');
  console.log('✓ toRapidxAlias — name is rapidx:<slug> not rapidx:gsd-<slug>');
}

// toRapidxAlias — no hint command
{
  const parsed = parseCommandFile(NO_HINT);
  const out = toRapidxAlias(parsed);
  assert.ok(out.includes('name: rapidx:next'), 'should be rapidx:next');
  assert.ok(!out.includes('argument-hint:'), 'should not add empty argument-hint');
  console.log('✓ toRapidxAlias — no argument-hint omitted');
}

// toCopilotPrompt — format
{
  const parsed = parseCommandFile(NEW_PROJECT);
  const out = toCopilotPrompt(parsed);
  assert.ok(out.startsWith('---'), 'should start with frontmatter');
  // VS Code prompt files use the `mode` field (ask|edit|agent). An invalid
  // `agent:` field leaves mode undefined → Copilot throws "reading 'bind'".
  assert.ok(/\nmode: agent\n/.test(out), 'should use mode: agent (VS Code prompt file spec)');
  assert.ok(!out.includes('agent: agent'), 'must NOT use the invalid agent: field');
  // Must NOT declare a tools list — tool names vary by Copilot version and an
  // unregistered tool (e.g. editFiles/findTestFiles on 0.48.x) makes Copilot
  // call .bind on undefined → "reading 'bind'". Omitting tools is version-proof.
  assert.ok(!/\ntools:\n/.test(out), 'must NOT emit a tools: frontmatter list');
  assert.ok(out.includes('[RapidX]'), 'description should have RapidX prefix');
  assert.ok(out.includes('## What this does'), 'should have objective section');
  assert.ok(out.includes('[--auto]'), 'should include usage hint');
  assert.ok(out.includes('/rapidx-new-project'), 'footer should reference /rapidx-<name> Copilot Chat command');
  // Workflow @references must be stripped — Copilot cannot resolve ~/.claude paths
  assert.ok(!out.includes('@~/.claude/'), 'should not contain @workflow references');
  console.log('✓ toCopilotPrompt — format and @reference stripping');
}

// toCursorCommand — format
{
  const parsed = parseCommandFile(NEW_PROJECT);
  const out = toCursorCommand(parsed);
  assert.ok(out.startsWith('---'), 'should start with frontmatter');
  assert.ok(out.includes('alwaysApply: false'), 'should have alwaysApply: false');
  assert.ok(out.includes('[RapidX]'), 'description should have RapidX prefix');
  assert.ok(out.includes('## How to invoke'), 'should have invocation section');
  assert.ok(out.includes('@.cursor/commands/rapidx/new-project.md'), 'should show correct @ path');
  assert.ok(!out.includes('@~/.claude/'), 'should not contain @workflow references');
  console.log('✓ toCursorCommand — format and @reference stripping');
}

// toCursorCommand — no hint in description when not present
{
  const parsed = parseCommandFile(NO_HINT);
  const out = toCursorCommand(parsed);
  assert.ok(out.includes('[RapidX]'));
  assert.ok(!out.includes('undefined'), 'should not have undefined in output');
  console.log('✓ toCursorCommand — no argumentHint does not leave undefined');
}

console.log('\nAll generate-commands tests passed.');
