#!/usr/bin/env node
'use strict';

/**
 * RapidX Secret Scanner Hook
 * Scans file write operations for hardcoded secrets and credentials.
 * Blocks the write if secrets are detected.
 *
 * Hook input via stdin:
 * {
 *   "hook_event_name": "PreToolUse",
 *   "tool_name": "Write",
 *   "tool_input": { "file_path": "...", "content": "..." }
 * }
 *
 * To block a tool use, exit with code 2 and write JSON to stdout:
 * { "decision": "block", "reason": "..." }
 */

const fs = require('fs');
const path = require('path');

// Secret patterns to detect
const SECRET_PATTERNS = [
  // API keys
  { pattern: /(['"`])(?:sk|pk|rk|api|key|token|secret|password|passwd|pwd)[-_](?:live|test|prod|dev)?[-_]?[a-z0-9]{20,}(['"`])/i, name: 'API key or secret' },
  // AWS
  { pattern: /AKIA[0-9A-Z]{16}/, name: 'AWS Access Key ID' },
  { pattern: /(?:aws.{0,20})?(?:secret.{0,20})?['"` ]([A-Za-z0-9/+=]{40})['"`\s]/i, name: 'AWS Secret Access Key (possible)' },
  // Generic password patterns
  { pattern: /(?:password|passwd|pwd)\s*[=:]\s*['"`](?!process\.env|os\.environ|\$\{)[^'"`\s]{8,}['"`]/i, name: 'Hardcoded password' },
  // JWT tokens
  { pattern: /eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/, name: 'JWT token' },
  // Private keys
  { pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/, name: 'Private key' },
  // GitHub tokens
  { pattern: /gh[pousr]_[A-Za-z0-9_]{36}/, name: 'GitHub token' },
  // Generic secrets in common config patterns
  { pattern: /(?:SECRET_KEY|API_KEY|AUTH_TOKEN|ACCESS_TOKEN)\s*=\s*['"`](?!process\.env|os\.environ|\$\{)[^'"`\s]{10,}['"`]/, name: 'Hardcoded secret in config' },
];

// Files to skip scanning (binary, generated, etc.)
const SKIP_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.ttf', '.eot', '.svg', '.pdf', '.lock'];
const SKIP_PATTERNS = [/node_modules/, /\.git\//, /dist\//, /build\//, /\.rapidx\/audit\.jsonl/];

let inputData = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { inputData += chunk; });
process.stdin.on('end', () => {
  let hookInput = {};
  try {
    hookInput = JSON.parse(inputData);
  } catch (_) {
    process.exit(0);
  }

  // Only scan Write tool calls
  if (hookInput.tool_name !== 'Write' || !hookInput.tool_input) {
    process.exit(0);
  }

  const filePath = hookInput.tool_input.file_path || '';
  const content = hookInput.tool_input.content || '';

  // Skip certain file types and paths
  const ext = path.extname(filePath).toLowerCase();
  if (SKIP_EXTENSIONS.includes(ext)) process.exit(0);
  if (SKIP_PATTERNS.some(p => p.test(filePath))) process.exit(0);

  // Skip .env and .env.example files (they're supposed to have secrets as examples)
  const basename = path.basename(filePath);
  if (basename.startsWith('.env')) process.exit(0);

  // Scan for secrets
  const findings = [];
  for (const { pattern, name } of SECRET_PATTERNS) {
    if (pattern.test(content)) {
      findings.push(name);
    }
  }

  if (findings.length > 0) {
    const reason = `Potential hardcoded secret(s) detected in ${filePath}: ${findings.join(', ')}. Use environment variables instead.`;

    // Write audit log entry
    try {
      const auditLog = path.join(process.cwd(), '.rapidx', 'audit.jsonl');
      const entry = {
        ts: new Date().toISOString(),
        hook: 'secret-scanner',
        event: 'secret_detected',
        file: filePath,
        findings: findings,
      };
      fs.appendFileSync(auditLog, JSON.stringify(entry) + '\n', 'utf8');
    } catch (_) {}

    // Block the write
    process.stdout.write(JSON.stringify({ decision: 'block', reason }));
    process.exit(2);
  }

  // Allow the write
  process.exit(0);
});
