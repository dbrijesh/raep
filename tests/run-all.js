#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const TEST_FILES = [
  'installer/detect-platforms.test.js',
  'installer/detect-stack.test.js',
  'installer/map-components.test.js',
  'installer/generate-workflow-scaffold.test.js',
  'profiles/schema-validation.test.js',
  'profiles/profile-loading.test.js',
  'hooks/audit-trail.test.js',
  'hooks/secret-scanner.test.js',
  'integration/full-flow.test.js',
];

const TESTS_DIR = __dirname;
let passed = 0;
let failed = 0;
let skipped = 0;

console.log('\nRapidX Platform Test Suite');
console.log('══════════════════════════\n');

for (const testFile of TEST_FILES) {
  const fullPath = path.join(TESTS_DIR, testFile);

  if (!fs.existsSync(fullPath)) {
    console.log(`  ⚠ SKIP  ${testFile} (not found)`);
    skipped++;
    continue;
  }

  try {
    execSync(`node "${fullPath}"`, {
      stdio: 'inherit',
      cwd: TESTS_DIR,
      timeout: 30000,
    });
    passed++;
  } catch (e) {
    console.error(`\n  ✗ FAIL  ${testFile}`);
    failed++;
  }
}

console.log('\n──────────────────────────────');
console.log(`  Passed:  ${passed}`);
if (skipped > 0) console.log(`  Skipped: ${skipped}`);
if (failed > 0) {
  console.log(`  Failed:  ${failed}`);
  console.log('\n  Some tests failed.\n');
  process.exit(1);
} else {
  console.log('\n  All tests passed.\n');
}
