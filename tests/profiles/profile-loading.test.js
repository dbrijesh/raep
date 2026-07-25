'use strict';

const assert = require('assert');
const { loadProfile, listProfiles, loadAndValidate } = require('../../src/profile-loader');

console.log('\nprofile-loading.test.js');

// Test 1: List profiles returns expected profiles
{
  const profiles = listProfiles();
  assert.ok(profiles.includes('default'), 'Should include default profile');
  assert.ok(profiles.includes('greenfield-startup'), 'Should include greenfield-startup');
  assert.ok(profiles.includes('enterprise-standard'), 'Should include enterprise-standard');
  assert.ok(profiles.includes('pharma-regulated'), 'Should include pharma-regulated');
  assert.ok(profiles.includes('finserv-sox'), 'Should include finserv-sox');
  assert.ok(profiles.includes('insurance-hipaa'), 'Should include insurance-hipaa');
  assert.ok(profiles.includes('workflow-modernization'), 'Should include workflow-modernization');
  assert.ok(!profiles.includes('_schema'), 'Should not include _schema');
  console.log(`  ✓ listProfiles returns ${profiles.length} profiles (correct set)`);
}

// Test 2: Load default profile
{
  const profile = loadProfile('default');
  assert.ok(profile, 'Default profile should load');
  assert.strictEqual(profile.profile_id, 'default');
  assert.ok(Array.isArray(profile.rules));
  assert.ok(Array.isArray(profile.skills));
  assert.ok(Array.isArray(profile.agents));
  assert.ok(Array.isArray(profile.hooks));
  console.log('  ✓ default profile loads with correct structure');
}

// Test 3: Load non-existent profile returns null
{
  const profile = loadProfile('does-not-exist-xyz');
  assert.strictEqual(profile, null, 'Non-existent profile should return null');
  console.log('  ✓ Non-existent profile returns null');
}

// Test 4: loadAndValidate falls back to default for unknown profile
{
  const profile = loadAndValidate('unknown-profile-xyz');
  assert.ok(profile, 'loadAndValidate should return a profile even for unknown ID');
  // Should fall back to default
  console.log('  ✓ loadAndValidate falls back to default for unknown profile');
}

// Test 5: loadAndValidate merges stack data
{
  const stackData = {
    frontend: { framework: 'react', version: '18.3.1' },
    backend: { language: 'typescript' },
  };

  const profile = loadAndValidate('default', stackData);
  assert.ok(profile._stack, 'Profile should have _stack property after merge');
  assert.strictEqual(profile._stack.frontend.framework, 'react', 'Stack data should be accessible via _stack');
  console.log('  ✓ loadAndValidate merges stack data into _stack property');
}

// Test 6: Enterprise standard profile has review gates
{
  const profile = loadProfile('enterprise-standard');
  assert.ok(profile.review_gates, 'enterprise-standard should have review_gates');
  assert.ok(profile.review_gates.length > 0, 'enterprise-standard should have at least one review gate');
  const mandatory = profile.review_gates.filter(g => g.mandatory);
  assert.ok(mandatory.length > 0, 'enterprise-standard should have mandatory review gates');
  console.log(`  ✓ enterprise-standard has ${profile.review_gates.length} review gates (${mandatory.length} mandatory)`);
}

// Test 7: Pharma profile has compliance governance
{
  const profile = loadProfile('pharma-regulated');
  assert.ok(profile.governance, 'pharma-regulated should have governance');
  assert.strictEqual(profile.governance.audit_trail, true, 'Pharma should have audit_trail enabled');
  assert.strictEqual(profile.governance.secret_scanning, true, 'Pharma should have secret_scanning enabled');
  assert.strictEqual(profile.governance.mandatory_review, true, 'Pharma should have mandatory_review enabled');
  console.log('  ✓ pharma-regulated has correct governance settings');
}

// Test 8: workflow-modernization profile loads with the 3 mandatory review gates
{
  const profile = loadProfile('workflow-modernization');
  assert.ok(profile, 'workflow-modernization profile should load');
  assert.strictEqual(profile.engagement.type, 'modernization');
  assert.strictEqual(profile.review_gates.length, 3, 'workflow-modernization should have exactly 3 review gates');
  assert.ok(profile.review_gates.every(g => g.mandatory), 'All workflow-modernization review gates should be mandatory');
  console.log('  ✓ workflow-modernization profile loads with 3 mandatory review gates');
}

console.log('  All profile-loading tests passed.\n');
