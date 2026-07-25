'use strict';

/**
 * Workflow Platform Scaffold Generator
 * -------------------------------------
 * Stamps templates/workflow-platform-scaffold/ (the genericized extraction of
 * AppianDemo/mgp — see SCAFFOLD_README.md) into a target directory, one time
 * per workflow-modernization engagement, substituting the platform-name
 * tokens throughout file contents AND path segments.
 *
 * Invoked via `bin/install.js --stamp-workflow-scaffold` or directly by the
 * workflow-forward-engineer agent.
 */

const fs = require('fs');
const path = require('path');

const PKG_ROOT = path.join(__dirname, '..');
const SCAFFOLD_SRC = path.join(PKG_ROOT, 'templates', 'workflow-platform-scaffold');

// Files stamped as-is with no token substitution (build metadata / lockfiles).
const NO_REWRITE_EXTS = new Set(['.pyc', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2']);

// Files never copied into a stamped target (scaffold-authoring metadata only).
const SKIP_NAMES = new Set(['SCAFFOLD_MANIFEST.json', 'SCAFFOLD_README.md']);

function toPascalCase(slug) {
  return slug
    .split(/[-_]/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');
}

/**
 * Build the ordered token substitution table for one stamping run.
 * Order matters: longer/more-specific tokens first.
 */
function buildTokenTable(platformName, platformSlug) {
  const upper = platformSlug.toUpperCase();
  const pascal = toPascalCase(platformSlug);
  return [
    ['{{platform_slug}}_shared', `${platformSlug}_shared`],
    ['{{PLATFORM_NAME}}', platformName],
    ['{{PLATFORM_BASE_AGENT_CLASS}}', `Base${pascal}Agent`],
    ['{{platform_seed_email_domain}}', `${platformSlug}.local`],
    ['{{platform_docker_network}}', platformSlug],
    ['{{PLATFORM_SLUG_UPPER}}', upper],
    ['{{platform_slug}}', platformSlug],
  ];
}

function applyTokens(text, tokenTable) {
  let out = text;
  for (const [token, value] of tokenTable) {
    out = out.split(token).join(value);
  }
  return out;
}

function isTextFile(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (NO_REWRITE_EXTS.has(ext)) return false;
  return true; // scaffold is source code + config — treat everything else as text
}

function copyAndStamp(src, dest, tokenTable) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (SKIP_NAMES.has(entry.name)) continue;
    const srcPath = path.join(src, entry.name);
    const destName = applyTokens(entry.name, tokenTable);
    const destPath = path.join(dest, destName);
    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyAndStamp(srcPath, destPath, tokenTable);
    } else if (isTextFile(entry.name)) {
      const content = fs.readFileSync(srcPath, 'utf8');
      fs.writeFileSync(destPath, applyTokens(content, tokenTable), 'utf8');
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function dirHasEntries(dir) {
  return fs.existsSync(dir) && fs.readdirSync(dir).length > 0;
}

/**
 * Stamp the workflow platform scaffold into targetDir.
 * @param {object} opts
 * @param {string} opts.targetDir - destination directory (created if absent)
 * @param {string} opts.platformName - human-readable platform name, e.g. "Test Co Governance Platform"
 * @param {string} opts.platformSlug - lowercase identifier-safe slug, e.g. "testco"
 * @param {boolean} [opts.force] - overwrite a non-empty targetDir
 * @returns {{ targetDir: string, fileCount: number }}
 */
function stampWorkflowScaffold(opts) {
  const { targetDir, platformName, platformSlug, force = false } = opts || {};

  if (!targetDir) throw new Error('stampWorkflowScaffold: targetDir is required');
  if (!platformName) throw new Error('stampWorkflowScaffold: platformName is required');
  if (!platformSlug || !/^[a-z][a-z0-9_]*$/.test(platformSlug)) {
    throw new Error('stampWorkflowScaffold: platformSlug must be a lowercase identifier (e.g. "testco")');
  }
  if (!fs.existsSync(SCAFFOLD_SRC)) {
    throw new Error(`stampWorkflowScaffold: scaffold source not found at ${SCAFFOLD_SRC}`);
  }

  if (dirHasEntries(targetDir) && !force) {
    throw new Error(`stampWorkflowScaffold: ${targetDir} is not empty. Pass --force to overwrite.`);
  }

  fs.mkdirSync(targetDir, { recursive: true });
  const tokenTable = buildTokenTable(platformName, platformSlug);
  copyAndStamp(SCAFFOLD_SRC, targetDir, tokenTable);

  let fileCount = 0;
  (function count(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) count(path.join(dir, entry.name));
      else fileCount++;
    }
  })(targetDir);

  const manifestPath = path.join(targetDir, '.rapidx-scaffold-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify({
    version: 1,
    stampedBy: 'rapidx-installer',
    stampedAt: new Date().toISOString(),
    platformName,
    platformSlug,
    fileCount,
  }, null, 2), 'utf8');

  process.stdout.write(`  [RapidX] Workflow platform scaffold stamped → ${targetDir} (${fileCount} files)\n`);
  return { targetDir, fileCount };
}

module.exports = { stampWorkflowScaffold, buildTokenTable, toPascalCase };
