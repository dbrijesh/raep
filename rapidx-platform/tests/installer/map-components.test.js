'use strict';

const assert = require('assert');
const { mapComponents } = require('../../src/map-components');

console.log('\nmap-components.test.js');

// Test 1: Always-installed components are present
{
  const result = mapComponents({});
  assert.ok(result.rules.has('common'), 'common rule should always be installed');
  assert.ok(result.skills.has('coding-standards'), 'coding-standards should always be installed');
  assert.ok(result.skills.has('security-review'), 'security-review should always be installed');
  assert.ok(result.skills.has('tdd-workflow'), 'tdd-workflow should always be installed');
  assert.ok(result.skills.has('strategic-compact'), 'strategic-compact should always be installed');
  assert.ok(result.skills.has('search-first'), 'search-first should always be installed');
  assert.ok(result.skills.has('verification-loop'), 'verification-loop should always be installed');
  assert.ok(result.agents.has('planner'), 'planner agent should always be installed');
  assert.ok(result.agents.has('architect'), 'architect agent should always be installed');
  assert.ok(result.hooks.has('audit-trail'), 'audit-trail hook should always be installed');
  assert.ok(result.hooks.has('secret-scanner'), 'secret-scanner hook should always be installed');
  console.log('  ✓ Always-installed components present');
}

// Test 2: React + TypeScript + PostgreSQL → ~18 skills
{
  const stack = {
    frontend: { framework: 'react', version: '18.3.1' },
    backend: { language: 'typescript', framework: 'express', api_style: ['rest'] },
    database: { primary: 'postgresql', orm: 'prisma' },
    infrastructure: { containers: ['docker'], cicd: ['github-actions'] },
    testing: { frameworks: ['vitest', 'playwright'] },
  };

  const result = mapComponents(stack);

  // Frontend
  assert.ok(result.skills.has('frontend-patterns'), 'frontend-patterns should be installed');
  assert.ok(result.skills.has('e2e-testing'), 'e2e-testing should be installed');
  assert.ok(result.agents.has('e2e-runner'), 'e2e-runner should be installed');
  assert.ok(result.agents.has('refactor-cleaner'), 'refactor-cleaner should be installed');

  // Backend
  assert.ok(result.rules.has('typescript'), 'typescript rule should be installed');
  assert.ok(result.skills.has('backend-patterns'), 'backend-patterns should be installed');
  assert.ok(result.skills.has('api-design'), 'api-design should be installed');

  // Database
  assert.ok(result.skills.has('postgres-patterns'), 'postgres-patterns should be installed');
  assert.ok(result.skills.has('database-migrations'), 'database-migrations should be installed');
  assert.ok(result.agents.has('database-reviewer'), 'database-reviewer should be installed');

  // Infrastructure
  assert.ok(result.skills.has('docker-patterns'), 'docker-patterns should be installed');
  assert.ok(result.skills.has('deployment-patterns'), 'deployment-patterns should be installed');

  // Verify TS skills NOT installed (no TS-specific extra skills in this stack)
  assert.ok(!result.skills.has('django-patterns'), 'django-patterns should NOT be installed');
  assert.ok(!result.skills.has('golang-patterns'), 'golang-patterns should NOT be installed');

  const skillCount = result.skills.size;
  assert.ok(skillCount >= 15, `Should have at least 15 skills, got ${skillCount}`);
  console.log(`  ✓ React + TypeScript + PostgreSQL → ${skillCount} skills (expected ≥15)`);
}

// Test 3: Python + Django → Django skills, NO TypeScript skills
{
  const stack = {
    backend: { language: 'python', framework: 'django', api_style: ['rest'] },
    database: { primary: 'postgresql' },
    testing: { frameworks: ['pytest'] },
  };

  const result = mapComponents(stack);

  assert.ok(result.rules.has('python'), 'python rule should be installed');
  assert.ok(result.skills.has('django-patterns'), 'django-patterns should be installed');
  assert.ok(result.skills.has('django-security'), 'django-security should be installed');
  assert.ok(result.skills.has('django-tdd'), 'django-tdd should be installed');
  assert.ok(result.skills.has('backend-patterns'), 'backend-patterns should be installed');
  assert.ok(result.agents.has('python-reviewer'), 'python-reviewer should be installed');

  assert.ok(!result.rules.has('typescript'), 'typescript rule should NOT be installed');
  assert.ok(!result.skills.has('frontend-patterns'), 'frontend-patterns should NOT be installed');
  assert.ok(!result.skills.has('golang-patterns'), 'golang-patterns should NOT be installed');
  console.log('  ✓ Python + Django → correct skills, TypeScript excluded');
}

// Test 4: Go project → Go skills, no TS/Python
{
  const stack = {
    backend: { language: 'go', framework: null, api_style: ['rest'] },
    database: { primary: 'postgresql' },
  };

  const result = mapComponents(stack);

  assert.ok(result.rules.has('golang'), 'golang rule should be installed');
  assert.ok(result.skills.has('golang-patterns'), 'golang-patterns should be installed');
  assert.ok(result.skills.has('golang-testing'), 'golang-testing should be installed');
  assert.ok(result.agents.has('go-reviewer'), 'go-reviewer should be installed');
  assert.ok(result.agents.has('go-build-resolver'), 'go-build-resolver should be installed');

  assert.ok(!result.rules.has('typescript'), 'typescript rule should NOT be installed');
  assert.ok(!result.skills.has('django-patterns'), 'django-patterns should NOT be installed');
  console.log('  ✓ Go project → Go skills, Python/TypeScript excluded');
}

// Test 5: Skipped components make sense
{
  const stack = {
    frontend: { framework: 'react' },
    backend: { language: 'typescript', framework: 'express' },
  };

  const result = mapComponents(stack);

  // Skipped should include python, golang, java, swift, php rules
  assert.ok(result.skipped.rules.includes('python'), 'python rule should be in skipped');
  assert.ok(result.skipped.rules.includes('golang'), 'golang rule should be in skipped');
  assert.ok(result.skipped.skills.includes('golang-patterns'), 'golang-patterns should be in skipped');
  assert.ok(result.skipped.skills.includes('django-patterns'), 'django-patterns should be in skipped');
  console.log('  ✓ Skipped components correctly identified');
}

// Test 6: iOS Swift → Swift skills
{
  const stack = {
    mobile: { framework: 'swift-ios' },
  };

  const result = mapComponents(stack);

  assert.ok(result.skills.has('swift-actor-persistence'), 'swift-actor-persistence should be installed');
  assert.ok(result.skills.has('liquid-glass-design'), 'liquid-glass-design should be installed');
  assert.ok(result.skills.has('foundation-models-on-device'), 'foundation-models-on-device should be installed');
  console.log('  ✓ iOS Swift mobile → Swift skills installed');
}

// Test 7: Regulated profile
{
  const stack = {
    profile: 'pharma-regulated',
    backend: { language: 'java', framework: 'springboot' },
  };

  const result = mapComponents(stack);
  // Still has always-installed
  assert.ok(result.skills.has('coding-standards'));
  // Java rules
  assert.ok(result.rules.has('java'));
  assert.ok(result.skills.has('springboot-patterns'));
  console.log('  ✓ Regulated profile + Java/SpringBoot → correct components');
}

console.log('  All map-components tests passed.\n');
