'use strict';

const assert = require('assert');
const path = require('path');

// ── Mock child_process ────────────────────────────────────────────────────────
const originalModule = require.cache[require.resolve('child_process')];

let mockResponses = {};

// Patch execSync before requiring the module under test
const childProcess = require('child_process');
const realExecSync = childProcess.execSync;

childProcess.execSync = function(cmd, opts) {
  for (const [key, response] of Object.entries(mockResponses)) {
    if (cmd.includes(key)) {
      if (response === null) throw new Error('Command not found');
      return Buffer.from(response);
    }
  }
  throw new Error(`Unmatched command: ${cmd}`);
};

// Clear module cache and re-require
delete require.cache[require.resolve('../../src/detect-platforms')];
const { detectPlatforms } = require('../../src/detect-platforms');

// ── Tests ─────────────────────────────────────────────────────────────────────

console.log('\ndetect-platforms.test.js');

// Test 1: Claude detected
mockResponses = {
  'claude --version': 'claude/2.3.1 darwin-arm64',
  'codex --version': null,
  'opencode --version': null,
  'gemini --version': null,
  'gh copilot': null,
  'gh extension': null,
  'code --version': null,
  'cursor --version': null,
};

// Override fs.accessSync for path checks
const fs = require('fs');
const realAccessSync = fs.accessSync;
fs.accessSync = () => { throw new Error('not found'); };

const result1 = detectPlatforms();
assert.strictEqual(result1.claude.detected, true, 'Claude should be detected');
assert.strictEqual(result1.claude.version, '2.3.1', 'Claude version should be 2.3.1');
assert.strictEqual(result1.codex.detected, false, 'Codex should not be detected');
console.log('  ✓ Claude detected from --version output');

// Test 2: VS Code with Copilot extensions
mockResponses = {
  'claude --version': null,
  'codex --version': null,
  'opencode --version': null,
  'gemini --version': null,
  'gh copilot': null,
  'gh extension': null,
  'code --version': '1.96.2\nabc123\ndarwin-arm64',
  'code --list-extensions': 'github.copilot\ngithub.copilot-chat\ndbaeumer.vscode-eslint',
  'cursor --version': null,
};

const result2 = detectPlatforms();
assert.strictEqual(result2.vscode.detected, true, 'VS Code should be detected');
assert.strictEqual(result2.vscode.copilot, true, 'Copilot extension should be detected');
assert.strictEqual(result2.vscode.copilotChat, true, 'Copilot Chat should be detected');
console.log('  ✓ VS Code with Copilot extensions detected');

// Test 3: VS Code without Copilot
mockResponses = {
  'claude --version': null,
  'codex --version': null,
  'opencode --version': null,
  'gemini --version': null,
  'gh copilot': null,
  'gh extension': null,
  'code --version': '1.96.2\nabc123\ndarwin-arm64',
  'code --list-extensions': 'dbaeumer.vscode-eslint\nesbenp.prettier-vscode',
  'cursor --version': null,
};

const result3 = detectPlatforms();
assert.strictEqual(result3.vscode.detected, true, 'VS Code should be detected');
assert.strictEqual(result3.vscode.copilot, false, 'Copilot should NOT be detected');
assert.strictEqual(result3.vscode.copilotChat, false, 'Copilot Chat should NOT be detected');
console.log('  ✓ VS Code without Copilot detected correctly');

// Test 4: Nothing detected
mockResponses = {
  'claude --version': null,
  'codex --version': null,
  'opencode --version': null,
  'gemini --version': null,
  'gh copilot': null,
  'gh extension': null,
  'code --version': null,
  'cursor --version': null,
};

const result4 = detectPlatforms();
assert.strictEqual(result4.claude.detected, false, 'Claude should not be detected');
assert.strictEqual(result4.vscode.detected, false, 'VS Code should not be detected');
assert.strictEqual(result4.cursor.detected, false, 'Cursor should not be detected');
console.log('  ✓ Nothing detected when all commands fail');

// Test 5: Return shape is correct
assert.ok('claude' in result4, 'Result should have claude key');
assert.ok('codex' in result4, 'Result should have codex key');
assert.ok('opencode' in result4, 'Result should have opencode key');
assert.ok('gemini' in result4, 'Result should have gemini key');
assert.ok('copilotCli' in result4, 'Result should have copilotCli key');
assert.ok('vscode' in result4, 'Result should have vscode key');
assert.ok('cursor' in result4, 'Result should have cursor key');
assert.ok('jetbrains' in result4, 'Result should have jetbrains key');
assert.ok('antigravity' in result4, 'Result should have antigravity key');
console.log('  ✓ Result shape has all required keys');

// Restore
childProcess.execSync = realExecSync;
fs.accessSync = realAccessSync;

console.log('  All detect-platforms tests passed.\n');
