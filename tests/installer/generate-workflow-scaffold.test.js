'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { stampWorkflowScaffold, buildTokenTable, toPascalCase } = require('../../src/generate-workflow-scaffold');

console.log('\ngenerate-workflow-scaffold.test.js');

function mkTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'rapidx-scaffold-test-'));
}

function walkFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(full));
    else out.push(full);
  }
  return out;
}

// Test 1: toPascalCase
{
  assert.strictEqual(toPascalCase('testco'), 'Testco');
  assert.strictEqual(toPascalCase('test-co'), 'TestCo');
  assert.strictEqual(toPascalCase('acme_corp'), 'AcmeCorp');
  console.log('  ✓ toPascalCase converts slugs correctly');
}

// Test 2: buildTokenTable produces expected substitutions, longest/most-specific first
{
  const table = buildTokenTable('Test Co', 'testco');
  const tokens = table.map(([token]) => token);
  assert.strictEqual(tokens[0], '{{platform_slug}}_shared', 'Most-specific compound token must come first');
  assert.strictEqual(tokens[tokens.length - 1], '{{platform_slug}}', 'Bare platform_slug token must come last');

  const asMap = Object.fromEntries(table);
  assert.strictEqual(asMap['{{platform_slug}}_shared'], 'testco_shared');
  assert.strictEqual(asMap['{{PLATFORM_NAME}}'], 'Test Co');
  assert.strictEqual(asMap['{{PLATFORM_BASE_AGENT_CLASS}}'], 'BaseTestcoAgent');
  assert.strictEqual(asMap['{{platform_seed_email_domain}}'], 'testco.local');
  assert.strictEqual(asMap['{{platform_docker_network}}'], 'testco');
  assert.strictEqual(asMap['{{PLATFORM_SLUG_UPPER}}'], 'TESTCO');
  assert.strictEqual(asMap['{{platform_slug}}'], 'testco');
  console.log('  ✓ buildTokenTable produces correct, correctly-ordered substitutions');
}

// Test 3: stampWorkflowScaffold rejects a missing/invalid platformSlug
{
  const dir = mkTempDir();
  assert.throws(() => stampWorkflowScaffold({ targetDir: dir, platformName: 'Test Co', platformSlug: 'Not-Valid!' }),
    /lowercase identifier/, 'Should reject a non-identifier-safe slug');
  assert.throws(() => stampWorkflowScaffold({ targetDir: dir, platformSlug: 'testco' }),
    /platformName is required/, 'Should reject a missing platformName');
  console.log('  ✓ stampWorkflowScaffold validates required options');
}

// Test 4: full stamp — token substitution in file contents and path segments
{
  const dir = mkTempDir();
  const target = path.join(dir, 'platform');
  const result = stampWorkflowScaffold({ targetDir: target, platformName: 'Test Co', platformSlug: 'testco' });

  assert.ok(result.fileCount > 0, 'Should stamp at least one file');
  assert.ok(fs.existsSync(path.join(target, '.rapidx-scaffold-manifest.json')), 'Should write a scaffold manifest');

  const manifest = JSON.parse(fs.readFileSync(path.join(target, '.rapidx-scaffold-manifest.json'), 'utf8'));
  assert.strictEqual(manifest.platformSlug, 'testco');
  assert.strictEqual(manifest.fileCount, result.fileCount);

  const allFiles = walkFiles(target);
  assert.ok(allFiles.length > 0, 'Should have copied files');

  // No stray unsubstituted *scaffold* tokens should remain anywhere in file
  // contents or paths — checked against the actual token vocabulary, not a
  // generic {{...}} pattern, since app source legitimately contains its own
  // unrelated double-brace syntax (JSX inline styles, runtime placeholder
  // text like "{{context_variable}}" meant for the generated app itself).
  const scaffoldTokens = buildTokenTable('X', 'x').map(([token]) => token);
  for (const file of allFiles) {
    const relPath = path.relative(target, file);
    for (const token of scaffoldTokens) {
      assert.ok(!relPath.includes(token), `Path should have no leftover token "${token}": ${file}`);
    }
    const ext = path.extname(file).toLowerCase();
    if (['.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2', '.pyc'].includes(ext)) continue;
    const content = fs.readFileSync(file, 'utf8');
    for (const token of scaffoldTokens) {
      assert.ok(!content.includes(token), `File content should have no leftover token "${token}": ${file}`);
    }
  }

  // Scaffold-authoring-only metadata files must never be copied into a stamped target.
  assert.ok(!allFiles.some(f => path.basename(f) === 'SCAFFOLD_MANIFEST.json'), 'SCAFFOLD_MANIFEST.json should not be copied');
  assert.ok(!allFiles.some(f => path.basename(f) === 'SCAFFOLD_README.md'), 'SCAFFOLD_README.md should not be copied');

  console.log(`  ✓ Full stamp produces ${result.fileCount} files with no leftover tokens`);
}

// Test 5: idempotency — re-stamping a non-empty target without --force throws
{
  const dir = mkTempDir();
  const target = path.join(dir, 'platform');
  stampWorkflowScaffold({ targetDir: target, platformName: 'Test Co', platformSlug: 'testco' });

  assert.throws(() => stampWorkflowScaffold({ targetDir: target, platformName: 'Test Co', platformSlug: 'testco' }),
    /is not empty/, 'Re-stamping a non-empty target without force should throw');

  // ...but succeeds with force: true
  const result = stampWorkflowScaffold({ targetDir: target, platformName: 'Test Co', platformSlug: 'testco', force: true });
  assert.ok(result.fileCount > 0, 'Force re-stamp should succeed');
  console.log('  ✓ Re-stamping without --force is rejected; --force allows overwrite');
}

console.log('  All generate-workflow-scaffold tests passed.\n');
