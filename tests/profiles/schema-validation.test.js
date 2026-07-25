'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { validateProfile } = require('../../src/profile-loader');

const PROFILES_DIR = path.join(__dirname, '..', '..', 'profiles');

console.log('\nschema-validation.test.js');

// Test 1: All profile files are valid JSON
{
  const files = fs.readdirSync(PROFILES_DIR).filter(f => f.endsWith('.json') && !f.startsWith('_'));
  assert.ok(files.length > 0, 'Should have at least one profile file');

  for (const file of files) {
    let profile;
    try {
      const text = fs.readFileSync(path.join(PROFILES_DIR, file), 'utf8');
      profile = JSON.parse(text);
    } catch (e) {
      assert.fail(`Profile ${file} is not valid JSON: ${e.message}`);
    }
    assert.ok(profile, `Profile ${file} should parse successfully`);
  }
  console.log(`  ✓ All ${files.length} profile files are valid JSON`);
}

// Test 2: All profiles have required fields
{
  const files = fs.readdirSync(PROFILES_DIR).filter(f => f.endsWith('.json') && !f.startsWith('_'));

  for (const file of files) {
    const profile = JSON.parse(fs.readFileSync(path.join(PROFILES_DIR, file), 'utf8'));
    const result = validateProfile(profile);

    if (!result.valid) {
      assert.fail(`Profile ${file} has validation errors: ${result.errors.join(', ')}`);
    }
  }
  console.log('  ✓ All profiles pass schema validation');
}

// Test 3: validateProfile catches missing required fields
{
  const incomplete = {
    profile_id: 'test',
    version: '1.0.0',
    // Missing: engagement, rules, skills, agents, hooks
  };

  const result = validateProfile(incomplete);
  assert.strictEqual(result.valid, false, 'Incomplete profile should fail validation');
  assert.ok(result.errors.some(e => e.includes('engagement')), 'Should report missing engagement');
  assert.ok(result.errors.some(e => e.includes('rules')), 'Should report missing rules');
  console.log('  ✓ validateProfile correctly catches missing required fields');
}

// Test 4: Invalid maturity level is caught
{
  const badMaturity = {
    profile_id: 'test',
    client_name: 'Test',
    version: '1.0.0',
    engagement: { type: 'greenfield', maturity_level: 'L99' },
    rules: [],
    skills: [],
    agents: [],
    hooks: [],
  };

  const result = validateProfile(badMaturity);
  assert.strictEqual(result.valid, false, 'Invalid maturity level should fail');
  assert.ok(result.errors.some(e => e.includes('maturity_level')), 'Should report maturity_level error');
  console.log('  ✓ validateProfile catches invalid maturity_level');
}

// Test 5: Invalid engagement type is caught
{
  const badType = {
    profile_id: 'test',
    client_name: 'Test',
    version: '1.0.0',
    engagement: { type: 'hack-and-slash', maturity_level: 'L1' },
    rules: [],
    skills: [],
    agents: [],
    hooks: [],
  };

  const result = validateProfile(badType);
  assert.strictEqual(result.valid, false, 'Invalid engagement type should fail');
  assert.ok(result.errors.some(e => e.includes('type')), 'Should report type error');
  console.log('  ✓ validateProfile catches invalid engagement type');
}

// Test 6: Specific profile values
{
  const pharma = JSON.parse(fs.readFileSync(path.join(PROFILES_DIR, 'pharma-regulated.json'), 'utf8'));
  assert.strictEqual(pharma.profile_id, 'pharma-regulated');
  assert.ok(pharma.governance.compliance_frameworks.includes('21 CFR Part 11'), 'Pharma profile should include 21 CFR Part 11');
  assert.strictEqual(pharma.governance.mandatory_review, true, 'Pharma should require mandatory review');
  console.log('  ✓ pharma-regulated profile has correct compliance frameworks');

  const finserv = JSON.parse(fs.readFileSync(path.join(PROFILES_DIR, 'finserv-sox.json'), 'utf8'));
  assert.ok(finserv.governance.compliance_frameworks.includes('SOX'), 'FinServ profile should include SOX');
  console.log('  ✓ finserv-sox profile has SOX compliance framework');

  const hipaa = JSON.parse(fs.readFileSync(path.join(PROFILES_DIR, 'insurance-hipaa.json'), 'utf8'));
  assert.ok(hipaa.governance.compliance_frameworks.includes('HIPAA'), 'HIPAA profile should include HIPAA');
  console.log('  ✓ insurance-hipaa profile has HIPAA compliance framework');
}

// Test 7: workflow-modernization profile has the 3 mandatory review gates and
// the 8 workflow agents
{
  const workflowMod = JSON.parse(fs.readFileSync(path.join(PROFILES_DIR, 'workflow-modernization.json'), 'utf8'));
  assert.strictEqual(workflowMod.profile_id, 'workflow-modernization');
  assert.strictEqual(workflowMod.engagement.type, 'modernization');

  const gateNames = workflowMod.review_gates.map(g => g.name);
  assert.deepStrictEqual(
    gateNames.sort(),
    ['blueprint-review', 'parity-review', 'reimagine-review'],
    'workflow-modernization should declare exactly the 3 review gates'
  );
  assert.ok(workflowMod.review_gates.every(g => g.mandatory === true), 'All 3 review gates should be mandatory');

  const expectedAgents = [
    'migration-analyst', 'workflow-logic-extractor', 'workflow-dependency-mapper',
    'workflow-forms-generator', 'workflow-data-modeler', 'workflow-topology-architect',
    'workflow-blueprint-architect', 'workflow-forward-engineer',
  ];
  expectedAgents.forEach(a => assert.ok(workflowMod.agents.includes(a), `workflow-modernization should include agent ${a}`));

  const expectedParitySkills = ['workflow-parity-appian', 'workflow-parity-pega', 'workflow-parity-baw', 'workflow-parity-mulesoft'];
  expectedParitySkills.forEach(s => assert.ok(workflowMod.skills.includes(s), `workflow-modernization should include skill ${s}`));

  console.log('  ✓ workflow-modernization profile has correct review gates, agents, and parity skills');
}

console.log('  All schema-validation tests passed.\n');
