#!/usr/bin/env node
/**
 * RapidX Codebase Learning Script
 *
 * Scans the current project and builds knowledge artifacts in .rapidx/knowledge/
 * so all installed AI tools reflect the project's actual patterns and standards.
 *
 * Usage:
 *   node scripts/learn-codebase.js [--all] [--code] [--docs] [--arch] [--guidelines]
 *   node scripts/learn-codebase.js --file <path>
 *   node scripts/learn-codebase.js --dir <path>
 *   node scripts/learn-codebase.js --sync-only
 *
 * Or via npx:
 *   npx rapidx-platform --learn
 *   npx rapidx-platform --learn --arch
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ─── CLI args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const all = args.includes('--all') || args.length === 0;
const flags = {
  all,
  code: args.includes('--code') || all,
  docs: args.includes('--docs') || all,
  arch: args.includes('--arch') || all,
  guidelines: args.includes('--guidelines') || all,
  mandates: args.includes('--mandates') || all,
  security: args.includes('--security') || all,
  reference: args.includes('--reference') || all,
  graph: args.includes('--graph') || all,
  syncOnly: args.includes('--sync-only'),
  preview: args.includes('--preview'),
  file: args.includes('--file') ? args[args.indexOf('--file') + 1] : null,
  dir: args.includes('--dir') ? args[args.indexOf('--dir') + 1] : null,
};

const cwd = process.cwd();
const knowledgeDir = path.join(cwd, '.rapidx', 'knowledge');
const stackPath = path.join(cwd, '.rapidx', 'stack.json');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function log(msg) { process.stdout.write(`[RapidX] ${msg}\n`); }
function err(msg) { process.stderr.write(`[RapidX] ERROR: ${msg}\n`); }

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function findFiles(dir, extensions, maxFiles = 200) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  function walk(current, depth) {
    if (depth > 8) return;
    if (results.length >= maxFiles) return;

    const skipDirs = ['node_modules', '.git', 'dist', 'build', 'coverage', '.next', '__pycache__', 'vendor'];
    let entries;
    try { entries = fs.readdirSync(current, { withFileTypes: true }); } catch { return; }

    for (const entry of entries) {
      if (results.length >= maxFiles) break;
      if (skipDirs.includes(entry.name)) continue;
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath, depth + 1);
      } else if (extensions.some(ext => entry.name.endsWith(ext))) {
        results.push(fullPath);
      }
    }
  }

  walk(dir, 0);
  return results;
}

function readStack() {
  const raw = readFile(stackPath);
  if (!raw) return { frontend: null, backend: null, database: null };
  try { return JSON.parse(raw); } catch { return {}; }
}

function now() {
  return new Date().toISOString().split('T')[0];
}

// ─── Code pattern extraction ─────────────────────────────────────────────────

function extractCodePatterns(stack) {
  log('Extracting code patterns from source files...');

  const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.java', '.cs', '.rs', '.rb', '.php'];
  const testExtensions = ['.test.ts', '.test.js', '.spec.ts', '.spec.js', '_test.go', '_test.py'];

  const srcDirs = ['src', 'lib', 'app', 'packages', 'services', 'api', 'components', 'utils'];
  const allFiles = [];

  for (const dir of srcDirs) {
    const dirPath = path.join(cwd, dir);
    allFiles.push(...findFiles(dirPath, codeExtensions, 50));
  }

  // Sample representative files
  const samples = allFiles.slice(0, 30);
  const patterns = {
    fileCount: allFiles.length,
    sampled: samples.length,
    naming: analyzeNaming(samples),
    imports: analyzeImports(samples),
    exports: analyzeExports(samples),
    testFiles: findFiles(cwd, ['.test.ts', '.test.js', '.spec.ts', '.spec.js', '_test.go'], 20),
  };

  return buildCodePatternsMarkdown(patterns, stack);
}

function analyzeNaming(files) {
  const camelCase = /^[a-z][a-zA-Z0-9]*$/;
  const kebabCase = /^[a-z][a-z0-9-]*$/;
  const pascalCase = /^[A-Z][a-zA-Z0-9]*$/;
  const snakeCase = /^[a-z][a-z0-9_]*$/;

  const fileNames = files.map(f => path.basename(f, path.extname(f)));
  const kebab = fileNames.filter(n => kebabCase.test(n)).length;
  const camel = fileNames.filter(n => camelCase.test(n)).length;
  const pascal = fileNames.filter(n => pascalCase.test(n)).length;
  const snake = fileNames.filter(n => snakeCase.test(n)).length;

  const dominant = [
    { style: 'kebab-case', count: kebab },
    { style: 'camelCase', count: camel },
    { style: 'PascalCase', count: pascal },
    { style: 'snake_case', count: snake },
  ].sort((a, b) => b.count - a.count)[0];

  return dominant.style;
}

function analyzeImports(files) {
  let esm = 0, cjs = 0;
  for (const file of files.slice(0, 10)) {
    const content = readFile(file) || '';
    if (content.includes("import ") && content.includes(" from '")) esm++;
    if (content.includes('require(')) cjs++;
  }
  return esm > cjs ? 'ESM (import/export)' : cjs > esm ? 'CommonJS (require)' : 'Mixed ESM/CJS';
}

function analyzeExports(files) {
  let named = 0, defaultExp = 0;
  for (const file of files.slice(0, 10)) {
    const content = readFile(file) || '';
    if (content.includes('export default')) defaultExp++;
    if (content.match(/export (const|function|class|type|interface)/)) named++;
  }
  return named > defaultExp ? 'Named exports preferred' : 'Default exports preferred';
}

function buildCodePatternsMarkdown(patterns, stack) {
  return `# Code Patterns — Learned from Codebase

**Learned**: ${now()}
**Files analyzed**: ${patterns.fileCount} source files (sampled ${patterns.sampled})
**Stack**: ${JSON.stringify({ frontend: stack.frontend?.framework, backend: stack.backend?.language, db: stack.database?.primary })}

---

## File Naming Conventions

- **Dominant style**: ${patterns.naming}
- **Module imports**: ${patterns.imports}
- **Module exports**: ${patterns.exports}

## Test File Structure

- Test files found: ${patterns.testFiles.length}
- Convention: ${patterns.testFiles.length > 0 ? detectTestConvention(patterns.testFiles) : 'No test files detected'}

## Notes for AI agents

When generating new code for this project:
1. Follow the **${patterns.naming}** naming convention for new files
2. Use **${patterns.imports}** style for module imports
3. Use **${patterns.exports}** pattern for module exports
4. Write tests following the detected test convention above

## Anti-patterns (do NOT use)

- Do not introduce new naming conventions that differ from the dominant style
- Do not mix ESM and CJS imports in the same file
- Do not create files without corresponding tests in src/ directories

---
*Regenerate with: \`/rapidx:learn --code\` or \`node scripts/learn-codebase.js --code\`*
`;
}

function detectTestConvention(testFiles) {
  const colocated = testFiles.filter(f => f.includes('/__tests__/') || f.includes('.test.') || f.includes('.spec.')).length;
  return colocated > 0 ? 'Co-located test files (*.test.ts / *.spec.ts)' : 'Separate test directory';
}

// ─── Architecture extraction ─────────────────────────────────────────────────

function extractArchitecture() {
  log('Extracting architecture knowledge...');

  const archFiles = [
    'ARCHITECTURE.md', 'docs/ARCHITECTURE.md', 'docs/architecture/README.md',
    'DESIGN.md', 'docs/DESIGN.md', 'RUNBOOK.md', 'docs/RUNBOOK.md',
  ].map(f => path.join(cwd, f)).filter(f => fs.existsSync(f));

  // Find ADRs
  const adrDirs = ['docs/adr', 'docs/decisions', 'architecture/decisions', 'decisions', 'adr'];
  const adrFiles = [];
  for (const dir of adrDirs) {
    const dirPath = path.join(cwd, dir);
    adrFiles.push(...findFiles(dirPath, ['.md'], 50));
  }

  const archContent = archFiles.map(f => `### From: ${path.relative(cwd, f)}\n\n${readFile(f) || ''}`).join('\n\n---\n\n');

  const adrSummaries = adrFiles.map(f => {
    const content = readFile(f) || '';
    const titleMatch = content.match(/^#\s+(.+)/m);
    const statusMatch = content.match(/\*\*?Status\*\*?:?\s*(.+)/i);
    return `- **${path.basename(f)}**: ${titleMatch ? titleMatch[1] : 'Unknown'} — Status: ${statusMatch ? statusMatch[1].trim() : 'Unknown'}`;
  }).join('\n');

  return `# Architecture Knowledge

**Analyzed**: ${now()}
**Architecture docs**: ${archFiles.length} files
**ADRs found**: ${adrFiles.length}

---

## Architecture Documents Summary

${archContent ? archContent.substring(0, 3000) + (archContent.length > 3000 ? '\n\n[... truncated — run /rapidx:learn-arch for full analysis ...]' : '') : '_No ARCHITECTURE.md found. Run /rapidx:learn-arch after creating one._'}

---

## Architecture Decision Records

${adrSummaries || '_No ADRs found. Consider adding docs/adr/ to document architecture decisions._'}

---

## Notes for AI agents

1. Respect existing architectural boundaries described above
2. Do not introduce patterns that contradict accepted ADRs
3. Run \`/rapidx:learn-arch\` for a deep ADR analysis and violation check

---
*Regenerate with: \`/rapidx:learn --arch\` or \`node scripts/learn-codebase.js --arch\`*
`;
}

// ─── Guidelines extraction ───────────────────────────────────────────────────

function extractGuidelines() {
  log('Extracting guidelines and coding standards...');

  const guidelineFiles = [
    '.eslintrc.js', '.eslintrc.json', '.eslintrc.yaml', 'eslint.config.js', 'eslint.config.mjs',
    '.prettierrc', '.prettierrc.json', '.editorconfig',
    'pyproject.toml', 'setup.cfg',
    'CONTRIBUTING.md', 'STYLE_GUIDE.md', 'CODING_STANDARDS.md',
    'docs/CONTRIBUTING.md', 'docs/STYLE_GUIDE.md',
  ].map(f => path.join(cwd, f)).filter(f => fs.existsSync(f));

  const contributing = readFile(path.join(cwd, 'CONTRIBUTING.md')) || readFile(path.join(cwd, 'docs/CONTRIBUTING.md')) || '';

  // Extract commit convention from CONTRIBUTING.md
  const conventionalCommits = contributing.toLowerCase().includes('conventional commit') || contributing.includes('feat:') || contributing.includes('fix:');
  const commitConvention = conventionalCommits ? 'Conventional Commits (feat:, fix:, docs:, etc.)' : 'Free-form (check CONTRIBUTING.md)';

  return `# Project Guidelines

**Extracted**: ${now()}
**Sources**: ${guidelineFiles.map(f => path.relative(cwd, f)).join(', ') || 'None found'}

---

## Code Style

${guidelineFiles.filter(f => f.includes('eslint') || f.includes('prettier')).length > 0
    ? '- ESLint and/or Prettier configured (see config files for rules)'
    : '- No linting config detected — consider adding ESLint/Prettier'}
${guidelineFiles.some(f => f.includes('.editorconfig'))
    ? '- EditorConfig present (consistent indent, line endings)'
    : '- No .editorconfig detected'}

## Git Conventions

- **Commit style**: ${commitConvention}
${contributing.includes('branch') ? '- Branch naming: See CONTRIBUTING.md' : ''}

## Testing Requirements

${contributing.toLowerCase().includes('test') || contributing.toLowerCase().includes('coverage')
    ? '- Testing requirements mentioned in CONTRIBUTING.md — see file for details'
    : '- No explicit testing requirements found in CONTRIBUTING.md'}

## PR Process

${contributing.toLowerCase().includes('pull request') || contributing.toLowerCase().includes('pr ')
    ? '- PR process documented in CONTRIBUTING.md'
    : '- No PR process documented'}

---
*Regenerate with: \`/rapidx:learn --guidelines\` or \`node scripts/learn-codebase.js --guidelines\`*
`;
}

// ─── Documentation extraction ────────────────────────────────────────────────

function extractDocs() {
  log('Extracting domain knowledge from documentation...');

  const readmeContent = readFile(path.join(cwd, 'README.md')) || '';
  const titleMatch = readmeContent.match(/^#\s+(.+)/m);
  const projectName = titleMatch ? titleMatch[1] : 'Unknown';

  // Find all docs
  const docFiles = findFiles(path.join(cwd, 'docs'), ['.md'], 30);

  return `# Domain Knowledge

**Extracted**: ${now()}
**Project**: ${projectName}
**Documentation files**: ${docFiles.length}

---

## Project Purpose

${readmeContent ? readmeContent.substring(0, 1000) + (readmeContent.length > 1000 ? '\n\n[... see README.md for full description ...]' : '') : '_No README.md found._'}

---

## Documentation Index

${docFiles.map(f => `- \`${path.relative(cwd, f)}\``).join('\n') || '_No docs/ directory found._'}

---

## Notes for AI agents

1. Use project terminology consistently (see README for defined terms)
2. Maintain documentation when implementing features (doc-updater agent)
3. Update docs/ index when adding new documentation

---
*Regenerate with: \`/rapidx:learn --docs\` or \`node scripts/learn-codebase.js --docs\`*
`;
}

// ─── Mandates extraction (governance / compliance / org policy) ───────────────

function extractMandates() {
  log('Extracting mandates and organizational policies...');

  // Org/team mandates live either in well-known docs or dropped into .rapidx/inputs/
  const mandateDocs = [
    'MANDATES.md', 'docs/MANDATES.md', 'POLICY.md', 'docs/POLICY.md',
    'GOVERNANCE.md', 'docs/GOVERNANCE.md', 'COMPLIANCE.md', 'docs/COMPLIANCE.md',
    'tech-radar.md', 'docs/tech-radar.md',
  ].map(f => path.join(cwd, f)).filter(f => fs.existsSync(f));

  const inputDocs = findFiles(path.join(cwd, '.rapidx', 'inputs'), ['.md', '.txt'], 30);

  const all = [...mandateDocs, ...inputDocs];
  const body = all.map(f => `### From: ${path.relative(cwd, f)}\n\n${(readFile(f) || '').substring(0, 2000)}`).join('\n\n---\n\n');

  return `# Mandates & Organizational Policy

**Extracted**: ${now()}
**Sources**: ${all.map(f => path.relative(cwd, f)).join(', ') || 'None found'}

---

## Mandates in force

${body || '_No mandate documents found. Drop org policies, tech-radar, or approved-library lists into `.rapidx/inputs/` and re-run `/rapidx:learn --mandates`._'}

---

## Notes for AI agents & invariants

1. Treat the mandates above as NON-NEGOTIABLE constraints when planning or coding.
2. These are prime candidates for **invariants** — run \`/rapidx:invariant-catalog --from-knowledge\`
   to turn mandates into enforced checks.
3. Flag any requested work that conflicts with a mandate before implementing it.

---
*Regenerate with: \`/rapidx:learn --mandates\`*
`;
}

// ─── Security artifacts extraction ─────────────────────────────────────────────

function extractSecurity() {
  log('Extracting security artifacts...');

  const securityDocs = [
    'SECURITY.md', 'docs/SECURITY.md', 'THREAT_MODEL.md', 'docs/THREAT_MODEL.md',
    'docs/security/README.md', '.github/SECURITY.md',
  ].map(f => path.join(cwd, f)).filter(f => fs.existsSync(f));

  // Signals of security tooling already in the repo
  const signals = {
    codeowners: fs.existsSync(path.join(cwd, 'CODEOWNERS')) || fs.existsSync(path.join(cwd, '.github', 'CODEOWNERS')),
    dependabot: fs.existsSync(path.join(cwd, '.github', 'dependabot.yml')),
    semgrep: fs.existsSync(path.join(cwd, '.semgrep.yml')) || findFiles(path.join(cwd, '.semgrep'), ['.yml', '.yaml'], 3).length > 0,
    codeql: findFiles(path.join(cwd, '.github', 'workflows'), ['.yml'], 30).some(f => (readFile(f) || '').includes('codeql')),
    envExample: fs.existsSync(path.join(cwd, '.env.example')),
    gitleaks: fs.existsSync(path.join(cwd, '.gitleaks.toml')),
  };

  const body = securityDocs.map(f => `### From: ${path.relative(cwd, f)}\n\n${(readFile(f) || '').substring(0, 2000)}`).join('\n\n---\n\n');

  return `# Security Artifacts

**Extracted**: ${now()}
**Security docs**: ${securityDocs.map(f => path.relative(cwd, f)).join(', ') || 'none'}

---

## Security tooling detected

- CODEOWNERS: ${signals.codeowners ? 'yes' : 'no'}
- Dependabot: ${signals.dependabot ? 'yes' : 'no'}
- Semgrep: ${signals.semgrep ? 'yes' : 'no'}
- CodeQL: ${signals.codeql ? 'yes' : 'no'}
- Secret scanning (gitleaks): ${signals.gitleaks ? 'yes' : 'no'}
- .env.example present: ${signals.envExample ? 'yes' : 'no'}

## Security documentation

${body || '_No SECURITY.md / threat model found. Add one and re-run `/rapidx:learn --security`._'}

---

## Notes for AI agents & invariants

1. Honor the security requirements above in every change (auth, validation, secrets).
2. The \`security-reviewer\` agent and \`secret-scanner\` hook enforce a baseline already.
3. Encode hard security rules as \`error\`-severity **invariants** via \`/rapidx:invariant-catalog\`.

---
*Regenerate with: \`/rapidx:learn --security\`*
`;
}

// ─── Reference implementation extraction ───────────────────────────────────────

function extractReference() {
  log('Identifying reference implementations...');

  const codeExtensions = ['.ts', '.tsx', '.js', '.py', '.go', '.java', '.cs', '.rb', '.php'];
  const srcDirs = ['src', 'lib', 'app', 'packages', 'services'];
  const candidates = [];
  for (const d of srcDirs) candidates.push(...findFiles(path.join(cwd, d), codeExtensions, 120));

  // Heuristic: a good reference file is one that has a co-located test and a
  // moderate (not trivial, not gigantic) size.
  const testNames = new Set(findFiles(cwd, ['.test.ts', '.test.js', '.spec.ts', '.spec.js', '_test.go', '_test.py'], 200).map(f =>
    path.basename(f).replace(/\.(test|spec)\.[a-z]+$/, '').replace(/_test\.[a-z]+$/, '')
  ));

  const scored = candidates.map(f => {
    const content = readFile(f) || '';
    const loc = content.split('\n').length;
    const base = path.basename(f).replace(path.extname(f), '');
    const hasTest = testNames.has(base);
    const score = (hasTest ? 100 : 0) + (loc >= 40 && loc <= 400 ? 50 : 0) + (content.includes('/**') ? 10 : 0);
    return { f, loc, hasTest, score };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 8);

  return `# Reference Implementations

**Identified**: ${now()}
**Candidates scanned**: ${candidates.length}

---

## Exemplary modules (follow these patterns for new code)

${scored.map(s => `- \`${path.relative(cwd, s.f)}\` — ${s.loc} LOC${s.hasTest ? ', has tests' : ''}`).join('\n') || '_No clear reference implementations detected (need tested, well-sized modules)._'}

---

## Notes for AI agents

1. When implementing similar functionality, mirror the structure, naming, error
   handling, and test style of the reference files above.
2. Prefer extending established patterns over introducing new ones.
3. Cross-check new code against \`.rapidx/knowledge/code-patterns.md\`.

---
*Regenerate with: \`/rapidx:learn --reference\`*
`;
}

// ─── Knowledge graph build ─────────────────────────────────────────────────────

function buildGraph() {
  log('Building codebase knowledge graph...');
  const script = path.join(cwd, 'scripts', 'build-knowledge-graph.js');
  if (!fs.existsSync(script)) {
    err('build-knowledge-graph.js not found — skipping graph build. (Re-run the installer to add it.)');
    return null;
  }
  try {
    execSync(`node "${script}" --quiet`, { cwd, stdio: 'inherit' });
    return '.rapidx/knowledge/graph.json';
  } catch (e) {
    err(`Knowledge graph build failed: ${e.message}`);
    return null;
  }
}

// ─── Sync to platforms ───────────────────────────────────────────────────────

function syncToPlatforms(knowledgeSummary) {
  log('Syncing knowledge to installed platform configs...');
  const synced = [];

  const knowledgeBlock = `
<!-- RapidX Knowledge Block — auto-generated ${now()} — regenerate with /rapidx:learn -->
## Project-Specific Patterns (Auto-learned)

${knowledgeSummary}

<!-- END RapidX Knowledge Block -->
`;

  // Claude Code — append to CLAUDE.md
  const claudeMdPath = path.join(cwd, 'CLAUDE.md');
  if (fs.existsSync(claudeMdPath)) {
    let content = readFile(claudeMdPath);
    content = content.replace(/<!-- RapidX Knowledge Block[\s\S]*?END RapidX Knowledge Block -->/g, '');
    content = content.trimEnd() + '\n\n' + knowledgeBlock;
    writeFile(claudeMdPath, content);
    synced.push('CLAUDE.md');
  }

  // Cursor rules
  const cursorRulesDir = path.join(cwd, '.cursor', 'rules');
  if (fs.existsSync(path.join(cwd, '.cursor'))) {
    writeFile(path.join(cursorRulesDir, 'rapidx-knowledge.mdc'), `---
description: RapidX auto-learned project patterns (run /rapidx:learn to refresh)
alwaysApply: true
---

${knowledgeSummary}
`);
    synced.push('.cursor/rules/rapidx-knowledge.mdc');
  }

  // VS Code Copilot instructions
  const copilotInstructionsPath = path.join(cwd, '.github', 'copilot-instructions.md');
  if (fs.existsSync(copilotInstructionsPath)) {
    let content = readFile(copilotInstructionsPath);
    content = content.replace(/<!-- RapidX Knowledge Block[\s\S]*?END RapidX Knowledge Block -->/g, '');
    content = content.trimEnd() + '\n\n' + knowledgeBlock;
    writeFile(copilotInstructionsPath, content);
    synced.push('.github/copilot-instructions.md');
  }

  // OpenCode instructions
  const opencodeInstructionsDir = path.join(cwd, '.opencode', 'instructions');
  if (fs.existsSync(path.join(cwd, '.opencode'))) {
    writeFile(path.join(opencodeInstructionsDir, 'project-knowledge.md'), knowledgeSummary);
    synced.push('.opencode/instructions/project-knowledge.md');
  }

  // Codex AGENTS.md
  const codexAgentsPath = path.join(cwd, '.codex', 'AGENTS.md');
  if (fs.existsSync(path.join(cwd, '.codex'))) {
    let content = readFile(codexAgentsPath) || '# AGENTS.md\n\n';
    content = content.replace(/<!-- RapidX Knowledge Block[\s\S]*?END RapidX Knowledge Block -->/g, '');
    content = content.trimEnd() + '\n\n' + knowledgeBlock;
    writeFile(codexAgentsPath, content);
    synced.push('.codex/AGENTS.md');
  }

  return synced;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  log('RapidX Codebase Learning System');
  log(`Working directory: ${cwd}`);

  fs.mkdirSync(knowledgeDir, { recursive: true });

  const stack = readStack();
  const written = [];

  if (!flags.syncOnly) {
    if (flags.code || flags.file || flags.dir) {
      const content = extractCodePatterns(stack);
      if (!flags.preview) {
        writeFile(path.join(knowledgeDir, 'code-patterns.md'), content);
        written.push('.rapidx/knowledge/code-patterns.md');
      } else {
        log('PREVIEW: code-patterns.md would be written');
      }
    }

    if (flags.arch) {
      const content = extractArchitecture();
      if (!flags.preview) {
        writeFile(path.join(knowledgeDir, 'architecture.md'), content);
        written.push('.rapidx/knowledge/architecture.md');
      } else {
        log('PREVIEW: architecture.md would be written');
      }
    }

    if (flags.guidelines) {
      const content = extractGuidelines();
      if (!flags.preview) {
        writeFile(path.join(knowledgeDir, 'guidelines.md'), content);
        written.push('.rapidx/knowledge/guidelines.md');
      } else {
        log('PREVIEW: guidelines.md would be written');
      }
    }

    if (flags.docs) {
      const content = extractDocs();
      if (!flags.preview) {
        writeFile(path.join(knowledgeDir, 'domain.md'), content);
        written.push('.rapidx/knowledge/domain.md');
      } else {
        log('PREVIEW: domain.md would be written');
      }
    }

    if (flags.mandates) {
      const content = extractMandates();
      if (!flags.preview) {
        writeFile(path.join(knowledgeDir, 'mandates.md'), content);
        written.push('.rapidx/knowledge/mandates.md');
      } else { log('PREVIEW: mandates.md would be written'); }
    }

    if (flags.security) {
      const content = extractSecurity();
      if (!flags.preview) {
        writeFile(path.join(knowledgeDir, 'security.md'), content);
        written.push('.rapidx/knowledge/security.md');
      } else { log('PREVIEW: security.md would be written'); }
    }

    if (flags.reference) {
      const content = extractReference();
      if (!flags.preview) {
        writeFile(path.join(knowledgeDir, 'reference.md'), content);
        written.push('.rapidx/knowledge/reference.md');
      } else { log('PREVIEW: reference.md would be written'); }
    }

    if (flags.graph && !flags.preview) {
      const g = buildGraph();
      if (g) written.push(g);
    } else if (flags.graph) {
      log('PREVIEW: knowledge graph would be built');
    }
  }

  // Build summary for sync
  const knowledgeSummary = written.filter(f => f.endsWith('.md')).map(f => {
    const content = readFile(path.join(cwd, f)) || '';
    return `### ${path.basename(f, '.md')}\n${content.split('\n').slice(0, 15).join('\n')}`;
  }).join('\n\n');

  // Sync to platforms
  if (!flags.preview) {
    const synced = syncToPlatforms(knowledgeSummary);

    // Write sync log
    const syncLogPath = path.join(knowledgeDir, 'SYNC_LOG.md');
    const logEntry = `| ${now()} | learn${flags.syncOnly ? '+sync' : ''} | ${written.length} files | ${synced.join(', ') || 'none'} |\n`;
    let syncLog = readFile(syncLogPath) || '# Knowledge Sync Log\n\n| Date | Event | Files | Platforms |\n|------|-------|-------|----------|\n';
    syncLog += logEntry;
    writeFile(syncLogPath, syncLog);

    log('\nKnowledge update complete!');
    log(`  Files written: ${written.length}`);
    written.forEach(f => log(`    ${f}`));
    log(`  Platforms synced: ${synced.length}`);
    synced.forEach(p => log(`    ${p}`));
    log('\n  Next: /rapidx:fine-tune to apply to agents and skills');
  } else {
    log('\nPREVIEW complete — no files written. Run without --preview to apply.');
  }
}

main().catch(e => { err(e.message); process.exit(1); });
