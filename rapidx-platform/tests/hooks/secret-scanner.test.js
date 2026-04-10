'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const HOOK_SCRIPT = path.join(__dirname, '..', '..', 'templates', 'hooks', 'rapidx', 'secret-scanner.js');

console.log('\nsecret-scanner.test.js');

function runHook(input, cwd) {
  const inputJson = JSON.stringify(input);
  try {
    const stdout = execSync(`node "${HOOK_SCRIPT}"`, {
      input: inputJson,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 5000,
      cwd: cwd || os.tmpdir(),
    });
    return { stdout, exitCode: 0 };
  } catch (e) {
    return { stdout: e.stdout || '', stderr: e.stderr || '', exitCode: e.status };
  }
}

// Test 1: Clean code passes (exits 0)
{
  const result = runHook({
    hook_event_name: 'PreToolUse',
    tool_name: 'Write',
    tool_input: {
      file_path: 'src/config.ts',
      content: `const apiKey = process.env.OPENAI_API_KEY;
const dbUrl = process.env.DATABASE_URL;
if (!apiKey) throw new Error('API key not configured');`,
    },
  });

  assert.strictEqual(result.exitCode, 0, 'Clean code should pass (exit 0)');
  console.log('  ✓ Clean code with env vars passes without blocking');
}

// Test 2: Hardcoded AWS key is blocked (exits 2)
{
  const result = runHook({
    hook_event_name: 'PreToolUse',
    tool_name: 'Write',
    tool_input: {
      file_path: 'src/aws.ts',
      content: `const client = new S3Client({
  credentials: {
    accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
    secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  },
});`,
    },
  });

  assert.strictEqual(result.exitCode, 2, 'AWS key should be blocked (exit 2)');
  const decision = JSON.parse(result.stdout);
  assert.strictEqual(decision.decision, 'block', 'Decision should be block');
  assert.ok(decision.reason.includes('secret'), 'Reason should mention secret');
  console.log('  ✓ AWS Access Key ID detected and blocked');
}

// Test 3: Hardcoded password is blocked
{
  const result = runHook({
    hook_event_name: 'PreToolUse',
    tool_name: 'Write',
    tool_input: {
      file_path: 'src/db.ts',
      content: `const connection = createConnection({
  host: 'localhost',
  password: 'MyS3cr3tP4ssw0rd!',
  database: 'mydb',
});`,
    },
  });

  assert.strictEqual(result.exitCode, 2, 'Hardcoded password should be blocked');
  console.log('  ✓ Hardcoded password detected and blocked');
}

// Test 4: Private key is blocked
{
  const result = runHook({
    hook_event_name: 'PreToolUse',
    tool_name: 'Write',
    tool_input: {
      file_path: 'src/auth.ts',
      content: `const privateKey = \`-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA2a2rwplBQLzHPZe5TNJNXI...
-----END RSA PRIVATE KEY-----\`;`,
    },
  });

  assert.strictEqual(result.exitCode, 2, 'Private key should be blocked');
  console.log('  ✓ RSA private key detected and blocked');
}

// Test 5: .env files are skipped
{
  const result = runHook({
    hook_event_name: 'PreToolUse',
    tool_name: 'Write',
    tool_input: {
      file_path: '.env.example',
      content: `OPENAI_API_KEY=sk-your-key-here
DATABASE_URL=postgresql://localhost/mydb
SECRET_KEY=your-secret-key-here`,
    },
  });

  assert.strictEqual(result.exitCode, 0, '.env files should not be blocked');
  console.log('  ✓ .env files are skipped (not scanned)');
}

// Test 6: Non-Write tool calls are allowed
{
  const result = runHook({
    hook_event_name: 'PreToolUse',
    tool_name: 'Bash',
    tool_input: { command: 'echo "AKIAIOSFODNN7EXAMPLE"' },
  });

  // Bash commands are not scanned (only Write operations)
  assert.strictEqual(result.exitCode, 0, 'Non-Write tools should pass through');
  console.log('  ✓ Non-Write tool calls pass through without scanning');
}

// Test 7: GitHub token is blocked
{
  const result = runHook({
    hook_event_name: 'PreToolUse',
    tool_name: 'Write',
    tool_input: {
      file_path: 'config.ts',
      content: `const token = 'ghp_1234567890abcdefghijklmnopqrstuvwxyz';`,
    },
  });

  assert.strictEqual(result.exitCode, 2, 'GitHub token should be blocked');
  console.log('  ✓ GitHub personal access token detected and blocked');
}

console.log('  All secret-scanner tests passed.\n');
