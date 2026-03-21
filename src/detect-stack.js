'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Safely read a file relative to a base directory.
 * Returns null if the file doesn't exist or can't be read.
 */
function readFile(baseDir, relPath) {
  const full = path.join(baseDir, relPath);
  try {
    return fs.readFileSync(full, 'utf8');
  } catch (_) {
    return null;
  }
}

/**
 * Safely parse JSON, returning null on failure.
 */
function parseJSON(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (_) {
    return null;
  }
}

/**
 * Extract a semver-ish version, stripping leading ^~>=.
 */
function clean(v) {
  if (!v || typeof v !== 'string') return null;
  return v.replace(/^[\^~>=<]+/, '').trim() || null;
}

/**
 * Get a dep version from a package.json deps object.
 */
function dep(deps, key) {
  if (!deps) return null;
  return clean(deps[key]) || null;
}

/**
 * Parse package.json for Node/TS/framework versions.
 */
function parsePackageJson(baseDir) {
  const text = readFile(baseDir, 'package.json');
  const pkg = parseJSON(text);
  if (!pkg) return null;

  const allDeps = Object.assign({}, pkg.dependencies, pkg.devDependencies);
  const engines = pkg.engines || {};

  return {
    source: 'package.json',
    node: clean(engines.node) || null,
    typescript: dep(allDeps, 'typescript'),
    react: dep(allDeps, 'react'),
    next: dep(allDeps, 'next'),
    angular: dep(allDeps, '@angular/core'),
    vue: dep(allDeps, 'vue'),
    svelte: dep(allDeps, 'svelte'),
    express: dep(allDeps, 'express'),
    nestjs: dep(allDeps, '@nestjs/core'),
    fastify: dep(allDeps, 'fastify'),
    jest: dep(allDeps, 'jest'),
    vitest: dep(allDeps, 'vitest'),
    playwright: dep(allDeps, '@playwright/test') || dep(allDeps, 'playwright'),
    prisma: dep(allDeps, '@prisma/client') || dep(allDeps, 'prisma'),
    drizzle: dep(allDeps, 'drizzle-orm'),
    typeorm: dep(allDeps, 'typeorm'),
  };
}

/**
 * Parse tsconfig.json for TypeScript target.
 */
function parseTsConfig(baseDir) {
  const text = readFile(baseDir, 'tsconfig.json');
  const cfg = parseJSON(text);
  if (!cfg) return null;
  return {
    source: 'tsconfig.json',
    target: (cfg.compilerOptions && cfg.compilerOptions.target) || null,
  };
}

/**
 * Parse .node-version or .nvmrc for Node version.
 */
function parseNodeVersion(baseDir) {
  const nv = readFile(baseDir, '.node-version');
  if (nv && nv.trim()) return { source: '.node-version', node: nv.trim().replace(/^v/, '') };
  const nvmrc = readFile(baseDir, '.nvmrc');
  if (nvmrc && nvmrc.trim()) return { source: '.nvmrc', node: nvmrc.trim().replace(/^v/, '') };
  return null;
}

/**
 * Parse Python version files.
 */
function parsePythonVersion(baseDir) {
  const pv = readFile(baseDir, '.python-version');
  if (pv && pv.trim()) return { source: '.python-version', python: pv.trim() };
  return null;
}

/**
 * Parse requirements.txt for python packages.
 */
function parseRequirementsTxt(baseDir) {
  const text = readFile(baseDir, 'requirements.txt');
  if (!text) return null;
  const result = { source: 'requirements.txt' };
  for (const line of text.split('\n')) {
    const clean_line = line.trim();
    if (!clean_line || clean_line.startsWith('#')) continue;
    const m = clean_line.match(/^([A-Za-z0-9_\-]+)\s*[>=<!~^]+\s*([\d.]+)/);
    if (m) {
      result[m[1].toLowerCase().replace(/-/g, '_')] = m[2];
    }
  }
  return result;
}

/**
 * Parse pyproject.toml for python packages.
 */
function parsePyprojectToml(baseDir) {
  const text = readFile(baseDir, 'pyproject.toml');
  if (!text) return null;
  const result = { source: 'pyproject.toml' };
  // Extract python version from [tool.poetry.dependencies] or [project]
  const pythonMatch = text.match(/python\s*=\s*["']([^"']+)["']/);
  if (pythonMatch) result.python = clean(pythonMatch[1]);

  // Extract notable deps — handles: fastapi = ">=0.110.0" or fastapi>=0.110.0
  const frameworks = ['django', 'fastapi', 'flask', 'sqlalchemy', 'pytest'];
  for (const fw of frameworks) {
    // Match: fw = ">=X.Y.Z" or fw = "^X.Y.Z" or fw = "X.Y.Z"
    const re = new RegExp(`${fw}\\s*=\\s*["'][>=<^~]*([\\d][\\d.]+)["']`, 'i');
    const m = text.match(re);
    if (m) { result[fw] = m[1]; continue; }
    // Match without quotes: fastapi>=0.110.0
    const re2 = new RegExp(`${fw}\\s*[>=<!~^]+\\s*([\\d][\\d.]+)`, 'i');
    const m2 = text.match(re2);
    if (m2) result[fw] = m2[1];
  }
  return result;
}

/**
 * Parse Pipfile for python packages.
 */
function parsePipfile(baseDir) {
  const text = readFile(baseDir, 'Pipfile');
  if (!text) return null;
  const result = { source: 'Pipfile' };
  const pythonMatch = text.match(/python_version\s*=\s*["']([^"']+)["']/);
  if (pythonMatch) result.python = pythonMatch[1];

  const frameworks = ['django', 'fastapi', 'flask'];
  for (const fw of frameworks) {
    const re = new RegExp(`${fw}\\s*=\\s*["'*>=<~^]+([\\d.]+)?`, 'i');
    const m = text.match(re);
    if (m && m[1]) result[fw] = m[1];
  }
  return result;
}

/**
 * Parse go.mod for Go version and dependencies.
 */
function parseGoMod(baseDir) {
  const text = readFile(baseDir, 'go.mod');
  if (!text) return null;
  const result = { source: 'go.mod', dependencies: {} };

  const goVersion = text.match(/^go\s+([\d.]+)/m);
  if (goVersion) result.go = goVersion[1];

  // Parse module requires
  const requireBlock = text.match(/require\s*\(([\s\S]*?)\)/);
  const lines = requireBlock ? requireBlock[1].split('\n') : [];
  for (const line of lines) {
    const m = line.trim().match(/^([\w.\-/]+)\s+(v[\d.]+)/);
    if (m) result.dependencies[m[1]] = m[2];
  }
  // Single-line requires
  for (const line of text.split('\n')) {
    const m = line.match(/^require\s+([\w.\-/]+)\s+(v[\d.]+)/);
    if (m) result.dependencies[m[1]] = m[2];
  }

  return result;
}

/**
 * Parse pom.xml for Java/Spring Boot versions.
 */
function parsePomXml(baseDir) {
  const text = readFile(baseDir, 'pom.xml');
  if (!text) return null;
  const result = { source: 'pom.xml' };

  const javaVersion = text.match(/<java\.version>([\d.]+)<\/java\.version>/);
  if (javaVersion) result.java = javaVersion[1];

  const springBoot = text.match(/<parent>[\s\S]*?spring-boot-starter-parent[\s\S]*?<version>([\d.]+)<\/version>/);
  if (springBoot) result.springboot = springBoot[1];

  // Also check <properties>
  const srcProp = text.match(/<maven\.compiler\.source>([\d.]+)<\/maven\.compiler\.source>/);
  if (srcProp && !result.java) result.java = srcProp[1];

  return result;
}

/**
 * Parse build.gradle for Java/Spring Boot versions.
 */
function parseBuildGradle(baseDir) {
  const text = readFile(baseDir, 'build.gradle') || readFile(baseDir, 'build.gradle.kts');
  if (!text) return null;
  const result = { source: 'build.gradle' };

  const javaVersion = text.match(/sourceCompatibility\s*=\s*['"]?([0-9.]+)['"]?/);
  if (javaVersion) result.java = javaVersion[1];

  const springBoot = text.match(/id\s*['"]org\.springframework\.boot['"]\s*version\s*['"]([^'"]+)['"]/);
  if (springBoot) result.springboot = springBoot[1];

  return result;
}

/**
 * Parse Gemfile for Ruby version.
 */
function parseGemfile(baseDir) {
  const text = readFile(baseDir, 'Gemfile');
  if (!text) return null;
  const result = { source: 'Gemfile' };
  const ruby = text.match(/ruby\s+['"]([^'"]+)['"]/);
  if (ruby) result.ruby = ruby[1];
  const rails = text.match(/gem\s+['"]rails['"]\s*,\s*['"]?[~>=<^]*\s*([\d.]+)/);
  if (rails) result.rails = rails[1];
  return result;
}

/**
 * Parse composer.json for PHP/Laravel versions.
 */
function parseComposerJson(baseDir) {
  const text = readFile(baseDir, 'composer.json');
  const pkg = parseJSON(text);
  if (!pkg) return null;
  const allDeps = Object.assign({}, pkg.require, pkg['require-dev']);
  const result = { source: 'composer.json' };
  if (allDeps['php']) result.php = clean(allDeps['php']);
  if (allDeps['laravel/framework']) result.laravel = clean(allDeps['laravel/framework']);
  return result;
}

/**
 * Parse Cargo.toml for Rust version/edition.
 */
function parseCargoToml(baseDir) {
  const text = readFile(baseDir, 'Cargo.toml');
  if (!text) return null;
  const result = { source: 'Cargo.toml' };
  const edition = text.match(/edition\s*=\s*["']([^"']+)["']/);
  if (edition) result.rust_edition = edition[1];
  const rustVersion = text.match(/rust-version\s*=\s*["']([^"']+)["']/);
  if (rustVersion) result.rust = rustVersion[1];
  return result;
}

/**
 * Parse .tool-versions (asdf format).
 */
function parseToolVersions(baseDir) {
  const text = readFile(baseDir, '.tool-versions');
  if (!text) return null;
  const result = { source: '.tool-versions' };
  for (const line of text.split('\n')) {
    const m = line.trim().match(/^(\S+)\s+(.+)$/);
    if (m) result[m[1]] = m[2].trim();
  }
  return result;
}

/**
 * Parse docker-compose.yml for database image versions.
 */
function parseDockerCompose(baseDir) {
  const text = readFile(baseDir, 'docker-compose.yml') || readFile(baseDir, 'docker-compose.yaml');
  if (!text) return null;
  const result = { source: 'docker-compose.yml', databases: {} };

  // Match image: postgres:16, mysql:8, redis:7, mongo:7, etc.
  const imageRe = /image:\s*['"]?([a-zA-Z0-9._\-/]+):([a-zA-Z0-9._\-]+)['"]?/g;
  let m;
  while ((m = imageRe.exec(text)) !== null) {
    const name = m[1].toLowerCase();
    const version = m[2];
    if (name.includes('postgres')) result.databases.postgresql = version;
    else if (name.includes('mysql')) result.databases.mysql = version;
    else if (name.includes('redis')) result.databases.redis = version;
    else if (name.includes('mongo')) result.databases.mongodb = version;
    else if (name.includes('mariadb')) result.databases.mariadb = version;
  }

  return result;
}

/**
 * Parse GitHub Actions workflows for CI/CD platform and runtime versions.
 */
function parseGithubWorkflows(baseDir) {
  const workflowDir = path.join(baseDir, '.github', 'workflows');
  let files;
  try {
    files = fs.readdirSync(workflowDir).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
  } catch (_) {
    return null;
  }
  if (!files.length) return null;

  const result = { source: '.github/workflows/', cicd: 'github-actions', runtimes: {} };

  for (const file of files) {
    const text = readFile(path.join(baseDir, '.github', 'workflows'), file) || '';
    // node-version
    const nodeVer = text.match(/node-version:\s*['"]?([0-9.x]+)['"]?/);
    if (nodeVer) result.runtimes.node = nodeVer[1];
    // python-version
    const pyVer = text.match(/python-version:\s*['"]?([0-9.x]+)['"]?/);
    if (pyVer) result.runtimes.python = pyVer[1];
    // java-version
    const javaVer = text.match(/java-version:\s*['"]?([0-9.x]+)['"]?/);
    if (javaVer) result.runtimes.java = javaVer[1];
    // go-version
    const goVer = text.match(/go-version:\s*['"]?([0-9.x]+)['"]?/);
    if (goVer) result.runtimes.go = goVer[1];
  }

  return result;
}

/**
 * Detect the full technology stack from project files.
 * @param {string} [baseDir=process.cwd()] - Project root directory to scan.
 * @returns {object} Structured stack detection result.
 */
function detectStack(baseDir) {
  baseDir = baseDir || process.cwd();

  const pkgJson = parsePackageJson(baseDir);
  const tsConfig = parseTsConfig(baseDir);
  const nodeVer = parseNodeVersion(baseDir);
  const pythonVer = parsePythonVersion(baseDir);
  const requirements = parseRequirementsTxt(baseDir);
  const pyproject = parsePyprojectToml(baseDir);
  const pipfile = parsePipfile(baseDir);
  const goMod = parseGoMod(baseDir);
  const pomXml = parsePomXml(baseDir);
  const buildGradle = parseBuildGradle(baseDir);
  const gemfile = parseGemfile(baseDir);
  const composerJson = parseComposerJson(baseDir);
  const cargoToml = parseCargoToml(baseDir);
  const toolVersions = parseToolVersions(baseDir);
  const dockerCompose = parseDockerCompose(baseDir);
  const githubWorkflows = parseGithubWorkflows(baseDir);

  // Consolidate node version
  const node = (nodeVer && nodeVer.node)
    || (pkgJson && pkgJson.node)
    || (toolVersions && toolVersions.nodejs)
    || (githubWorkflows && githubWorkflows.runtimes && githubWorkflows.runtimes.node)
    || null;

  // Consolidate python version
  const python = (pythonVer && pythonVer.python)
    || (pyproject && pyproject.python)
    || (pipfile && pipfile.python)
    || (toolVersions && toolVersions.python)
    || (githubWorkflows && githubWorkflows.runtimes && githubWorkflows.runtimes.python)
    || null;

  return {
    node: node ? { version: node, source: (nodeVer && nodeVer.source) || (pkgJson && pkgJson.source) || 'package.json' } : null,
    typescript: pkgJson && pkgJson.typescript ? { version: pkgJson.typescript, source: 'package.json' } : null,
    tsTarget: tsConfig && tsConfig.target ? { value: tsConfig.target, source: 'tsconfig.json' } : null,

    // Frontend
    react: pkgJson && pkgJson.react ? { version: pkgJson.react, source: 'package.json' } : null,
    next: pkgJson && pkgJson.next ? { version: pkgJson.next, source: 'package.json' } : null,
    angular: pkgJson && pkgJson.angular ? { version: pkgJson.angular, source: 'package.json' } : null,
    vue: pkgJson && pkgJson.vue ? { version: pkgJson.vue, source: 'package.json' } : null,
    svelte: pkgJson && pkgJson.svelte ? { version: pkgJson.svelte, source: 'package.json' } : null,

    // Backend JS
    express: pkgJson && pkgJson.express ? { version: pkgJson.express, source: 'package.json' } : null,
    nestjs: pkgJson && pkgJson.nestjs ? { version: pkgJson.nestjs, source: 'package.json' } : null,
    fastify: pkgJson && pkgJson.fastify ? { version: pkgJson.fastify, source: 'package.json' } : null,

    // Testing
    jest: pkgJson && pkgJson.jest ? { version: pkgJson.jest, source: 'package.json' } : null,
    vitest: pkgJson && pkgJson.vitest ? { version: pkgJson.vitest, source: 'package.json' } : null,
    playwright: pkgJson && pkgJson.playwright ? { version: pkgJson.playwright, source: 'package.json' } : null,

    // ORM
    prisma: pkgJson && pkgJson.prisma ? { version: pkgJson.prisma, source: 'package.json' } : null,
    drizzle: pkgJson && pkgJson.drizzle ? { version: pkgJson.drizzle, source: 'package.json' } : null,
    typeorm: pkgJson && pkgJson.typeorm ? { version: pkgJson.typeorm, source: 'package.json' } : null,

    // Python
    python: python ? { version: python, source: (pythonVer && pythonVer.source) || '.python-version' } : null,
    django: (requirements && requirements.django) ? { version: requirements.django, source: 'requirements.txt' }
      : (pyproject && pyproject.django) ? { version: pyproject.django, source: 'pyproject.toml' } : null,
    fastapi: (requirements && requirements.fastapi) ? { version: requirements.fastapi, source: 'requirements.txt' }
      : (pyproject && pyproject.fastapi) ? { version: pyproject.fastapi, source: 'pyproject.toml' } : null,
    flask: (requirements && requirements.flask) ? { version: requirements.flask, source: 'requirements.txt' }
      : (pyproject && pyproject.flask) ? { version: pyproject.flask, source: 'pyproject.toml' } : null,
    sqlalchemy: (requirements && requirements.sqlalchemy) ? { version: requirements.sqlalchemy, source: 'requirements.txt' }
      : (pyproject && pyproject.sqlalchemy) ? { version: pyproject.sqlalchemy, source: 'pyproject.toml' } : null,
    pytest: (requirements && requirements.pytest) ? { version: requirements.pytest, source: 'requirements.txt' }
      : (pyproject && pyproject.pytest) ? { version: pyproject.pytest, source: 'pyproject.toml' } : null,

    // Go
    go: goMod && goMod.go ? { version: goMod.go, source: 'go.mod' } : null,
    goDependencies: goMod && goMod.dependencies ? { value: goMod.dependencies, source: 'go.mod' } : null,

    // Java
    java: (pomXml && pomXml.java) ? { version: pomXml.java, source: 'pom.xml' }
      : (buildGradle && buildGradle.java) ? { version: buildGradle.java, source: 'build.gradle' }
      : (githubWorkflows && githubWorkflows.runtimes && githubWorkflows.runtimes.java)
        ? { version: githubWorkflows.runtimes.java, source: '.github/workflows/' } : null,
    springboot: (pomXml && pomXml.springboot) ? { version: pomXml.springboot, source: 'pom.xml' }
      : (buildGradle && buildGradle.springboot) ? { version: buildGradle.springboot, source: 'build.gradle' } : null,

    // Ruby
    ruby: gemfile && gemfile.ruby ? { version: gemfile.ruby, source: 'Gemfile' } : null,
    rails: gemfile && gemfile.rails ? { version: gemfile.rails, source: 'Gemfile' } : null,

    // PHP
    php: composerJson && composerJson.php ? { version: composerJson.php, source: 'composer.json' } : null,
    laravel: composerJson && composerJson.laravel ? { version: composerJson.laravel, source: 'composer.json' } : null,

    // Rust
    rust: cargoToml ? { edition: cargoToml.rust_edition, version: cargoToml.rust, source: 'Cargo.toml' } : null,

    // Databases from docker-compose
    databases: dockerCompose && dockerCompose.databases ? { value: dockerCompose.databases, source: dockerCompose.source } : null,

    // CI/CD
    cicd: githubWorkflows ? { platform: githubWorkflows.cicd, source: githubWorkflows.source } : null,

    // asdf
    toolVersions: toolVersions || null,
  };
}

module.exports = { detectStack };
