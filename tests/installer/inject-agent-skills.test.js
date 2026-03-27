'use strict';

const assert = require('assert');
const { injectAgentSkills, resolveSkills, candidateSkills } = require('../../src/inject-agent-skills');

const BASE_AGENT = `---
description: Code reviewer agent
alwaysApply: false
---
# Agent: Code Reviewer

## Role
Review code for quality and security.
`;

// ─── candidateSkills ──────────────────────────────────────────────────────────

{
  const skills = candidateSkills('code-reviewer');
  assert.ok(Array.isArray(skills), 'should return array');
  assert.ok(skills.includes('coding-standards'), 'code-reviewer should include coding-standards');
  assert.ok(skills.includes('security-review'), 'code-reviewer should include security-review');
  console.log('✓ candidateSkills — code-reviewer has expected skills');
}

{
  const skills = candidateSkills('nonexistent-agent');
  assert.deepStrictEqual(skills, [], 'unknown agent returns empty array');
  console.log('✓ candidateSkills — unknown agent returns []');
}

// ─── resolveSkills ────────────────────────────────────────────────────────────

{
  // Only coding-standards and frontend-patterns installed — security-review not installed
  const installed = new Set(['coding-standards', 'frontend-patterns', 'tdd-workflow']);
  const resolved = resolveSkills('code-reviewer', installed);
  assert.ok(resolved.includes('coding-standards'), 'should include installed skill');
  assert.ok(resolved.includes('frontend-patterns'), 'should include installed optional skill');
  assert.ok(!resolved.includes('security-review'), 'should exclude uninstalled skill');
  console.log('✓ resolveSkills — only returns installed skills');
}

{
  // Full install — all candidate skills present
  const installed = new Set(['coding-standards', 'security-review', 'frontend-patterns', 'backend-patterns', 'golang-patterns', 'python-patterns', 'django-patterns', 'springboot-patterns', 'laravel-patterns', 'dotnet-patterns', 'cpp-coding-standards', 'java-coding-standards', 'perl-patterns', 'swift-actor-persistence']);
  const resolved = resolveSkills('code-reviewer', installed);
  assert.ok(resolved.length > 2, 'full install returns multiple skills');
  console.log('✓ resolveSkills — full install returns all matching candidates');
}

{
  // No skills installed
  const resolved = resolveSkills('tdd-guide', new Set());
  assert.deepStrictEqual(resolved, [], 'empty installed set returns no skills');
  console.log('✓ resolveSkills — empty installed set returns []');
}

{
  // Array input also works
  const resolved = resolveSkills('code-reviewer', ['coding-standards', 'security-review']);
  assert.ok(resolved.includes('coding-standards'));
  assert.ok(resolved.includes('security-review'));
  console.log('✓ resolveSkills — accepts array input');
}

// ─── injectAgentSkills ────────────────────────────────────────────────────────

{
  // Copilot — skills present
  const installed = new Set(['coding-standards', 'security-review']);
  const out = injectAgentSkills(BASE_AGENT, 'code-reviewer', installed, 'copilot');
  assert.ok(out.includes('## Active skills'), 'should add Active skills section');
  assert.ok(out.includes('#file:.github/copilot/skills/coding-standards.md'), 'should have copilot #file: ref');
  assert.ok(out.includes('#file:.github/copilot/skills/security-review.md'), 'should have security-review ref');
  assert.ok(out.startsWith('---'), 'should preserve original frontmatter');
  console.log('✓ injectAgentSkills — copilot: injects #file: skill refs');
}

{
  // Cursor — skills present
  const installed = new Set(['coding-standards', 'security-review']);
  const out = injectAgentSkills(BASE_AGENT, 'code-reviewer', installed, 'cursor');
  assert.ok(out.includes('## Active skills'), 'should add Active skills section');
  assert.ok(out.includes('@.cursor/skills/coding-standards/SKILL.md'), 'should have cursor @ ref');
  assert.ok(out.includes('@.cursor/skills/security-review/SKILL.md'), 'should have security-review ref');
  assert.ok(!out.includes('#file:'), 'cursor format should not have #file: refs');
  console.log('✓ injectAgentSkills — cursor: injects @ skill refs');
}

{
  // No matching skills installed — content unchanged
  const out = injectAgentSkills(BASE_AGENT, 'code-reviewer', new Set(['tdd-workflow']), 'copilot');
  assert.ok(!out.includes('## Active skills'), 'no section added when no skills match');
  assert.strictEqual(out.trimEnd(), BASE_AGENT.trimEnd(), 'content unchanged when no skills match');
  console.log('✓ injectAgentSkills — no section added when no matching skills installed');
}

{
  // Unknown agent — content unchanged
  const out = injectAgentSkills(BASE_AGENT, 'unknown-agent', new Set(['coding-standards']), 'copilot');
  assert.ok(!out.includes('## Active skills'), 'unknown agent gets no skills section');
  console.log('✓ injectAgentSkills — unknown agent leaves content unchanged');
}

{
  // Only tech-stack-specific skills injected, not unrelated ones
  // e2e-runner should get e2e-testing but NOT security-review
  const installed = new Set(['e2e-testing', 'security-review', 'verification-loop', 'frontend-patterns']);
  const out = injectAgentSkills(BASE_AGENT, 'e2e-runner', installed, 'cursor');
  assert.ok(out.includes('e2e-testing'), 'e2e-runner gets e2e-testing');
  assert.ok(out.includes('verification-loop'), 'e2e-runner gets verification-loop');
  assert.ok(!out.includes('security-review'), 'e2e-runner does not get security-review');
  console.log('✓ injectAgentSkills — only relevant skills injected per agent-skill-map');
}

console.log('\nAll inject-agent-skills tests passed.');
