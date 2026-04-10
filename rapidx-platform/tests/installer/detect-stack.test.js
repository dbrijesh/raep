'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { detectStack } = require('../../src/detect-stack');

// ── Setup temp directory ───────────────────────────────────────────────────────
function createTempDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rapidx-test-'));
  return dir;
}

function cleanup(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {}
}

console.log('\ndetect-stack.test.js');

// Test 1: Parse package.json with React + TypeScript
{
  const dir = createTempDir();
  const pkg = {
    name: 'my-app',
    engines: { node: '>=20.0.0' },
    dependencies: {
      react: '^18.3.1',
      'react-dom': '^18.3.1',
      express: '^4.18.2',
      '@prisma/client': '^5.10.0',
    },
    devDependencies: {
      typescript: '^5.4.5',
      vitest: '^1.4.0',
      '@playwright/test': '^1.42.0',
    },
  };
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkg), 'utf8');

  const result = detectStack(dir);
  assert.ok(result.react, 'react should be detected');
  assert.strictEqual(result.react.version, '18.3.1', 'react version should be 18.3.1');
  assert.ok(result.typescript, 'typescript should be detected');
  assert.strictEqual(result.typescript.version, '5.4.5', 'typescript version should be 5.4.5');
  assert.ok(result.express, 'express should be detected');
  assert.ok(result.prisma, 'prisma should be detected');
  assert.ok(result.vitest, 'vitest should be detected');
  assert.ok(result.playwright, 'playwright should be detected');
  assert.strictEqual(result.react.source, 'package.json', 'source should be package.json');
  cleanup(dir);
  console.log('  ✓ package.json parsed correctly (React + TypeScript + Express + Prisma)');
}

// Test 2: Go project
{
  const dir = createTempDir();
  fs.writeFileSync(path.join(dir, 'go.mod'), `module github.com/example/myapp

go 1.22

require (
  github.com/gin-gonic/gin v1.9.1
  github.com/go-gorm/gorm v1.25.7
)
`, 'utf8');

  const result = detectStack(dir);
  assert.ok(result.go, 'go should be detected');
  assert.strictEqual(result.go.version, '1.22', 'go version should be 1.22');
  assert.ok(result.goDependencies, 'go dependencies should be detected');
  cleanup(dir);
  console.log('  ✓ go.mod parsed correctly');
}

// Test 3: Python project with requirements.txt
{
  const dir = createTempDir();
  fs.writeFileSync(path.join(dir, 'requirements.txt'), `django==5.0.2
djangorestframework>=3.14.0
psycopg2-binary==2.9.9
pytest==8.0.2
`, 'utf8');
  fs.writeFileSync(path.join(dir, '.python-version'), '3.12.2', 'utf8');

  const result = detectStack(dir);
  assert.ok(result.python, 'python should be detected');
  assert.strictEqual(result.python.version, '3.12.2', 'python version should be 3.12.2');
  assert.ok(result.django, 'django should be detected');
  assert.strictEqual(result.django.version, '5.0.2', 'django version should be 5.0.2');
  cleanup(dir);
  console.log('  ✓ requirements.txt + .python-version parsed correctly');
}

// Test 4: Docker Compose with database versions
{
  const dir = createTempDir();
  fs.writeFileSync(path.join(dir, 'docker-compose.yml'), `version: '3.9'
services:
  db:
    image: postgres:16.2
  cache:
    image: redis:7.2-alpine
  app:
    build: .
`, 'utf8');

  const result = detectStack(dir);
  assert.ok(result.databases, 'databases should be detected');
  assert.strictEqual(result.databases.value.postgresql, '16.2', 'postgres version should be 16.2');
  assert.strictEqual(result.databases.value.redis, '7.2-alpine', 'redis version should be 7.2-alpine');
  cleanup(dir);
  console.log('  ✓ docker-compose.yml database versions parsed correctly');
}

// Test 5: pyproject.toml
{
  const dir = createTempDir();
  fs.writeFileSync(path.join(dir, 'pyproject.toml'), `[tool.poetry]
name = "my-service"

[tool.poetry.dependencies]
python = "^3.11"
fastapi = ">=0.110.0"
sqlalchemy = ">=2.0.0"
pytest = ">=8.0"
`, 'utf8');

  const result = detectStack(dir);
  assert.ok(result.python, 'python should be detected from pyproject.toml');
  assert.ok(result.fastapi, 'fastapi should be detected');
  cleanup(dir);
  console.log('  ✓ pyproject.toml parsed correctly');
}

// Test 6: Empty directory returns all nulls
{
  const dir = createTempDir();
  const result = detectStack(dir);
  assert.strictEqual(result.react, null, 'react should be null for empty project');
  assert.strictEqual(result.node, null, 'node should be null for empty project');
  cleanup(dir);
  console.log('  ✓ Empty directory returns null for all fields');
}

// Test 7: .node-version file
{
  const dir = createTempDir();
  fs.writeFileSync(path.join(dir, '.node-version'), 'v20.11.0\n', 'utf8');

  const result = detectStack(dir);
  assert.ok(result.node, 'node should be detected from .node-version');
  assert.strictEqual(result.node.version, '20.11.0', 'node version should strip v prefix');
  cleanup(dir);
  console.log('  ✓ .node-version parsed correctly');
}

console.log('  All detect-stack tests passed.\n');
