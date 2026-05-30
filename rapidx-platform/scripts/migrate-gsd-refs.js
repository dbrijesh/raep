'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'get-things-done');
const TEXT_EXTS = new Set(['.md', '.txt', '.json', '.toml', '.yaml', '.yml']);

// Ordered from most-specific to least-specific to avoid partial matches.
// Preserves external references: @gsd-build/sdk npm org, github.com/gsd*, has_gsd_marker.
const REWRITES = [
  [/\/gsd:/g,                          '/rapidx:'],
  [/\bgsd:(\S+)/g,                     'rapidx:$1'],
  [/gsd-tools\.cjs/g,                  'rapidx-tools.cjs'],
  [/gsd-advisor-researcher/g,          'rapidx-advisor-researcher'],
  [/gsd-ai-researcher/g,               'rapidx-ai-researcher'],
  [/gsd-assumptions-analyzer/g,        'rapidx-assumptions-analyzer'],
  [/gsd-code-fixer/g,                  'rapidx-code-fixer'],
  [/gsd-code-reviewer/g,               'rapidx-code-reviewer'],
  [/gsd-codebase-mapper/g,             'rapidx-codebase-mapper'],
  [/gsd-debug-session-manager/g,       'rapidx-debug-session-manager'],
  [/gsd-debugger/g,                    'rapidx-debugger'],
  [/gsd-doc-classifier/g,              'rapidx-doc-classifier'],
  [/gsd-doc-synthesizer/g,             'rapidx-doc-synthesizer'],
  [/gsd-doc-verifier/g,                'rapidx-doc-verifier'],
  [/gsd-doc-writer/g,                  'rapidx-doc-writer'],
  [/gsd-domain-researcher/g,           'rapidx-domain-researcher'],
  [/gsd-eval-auditor/g,                'rapidx-eval-auditor'],
  [/gsd-eval-planner/g,                'rapidx-eval-planner'],
  [/gsd-executor/g,                    'rapidx-executor'],
  [/gsd-framework-selector/g,          'rapidx-framework-selector'],
  [/gsd-integration-checker/g,         'rapidx-integration-checker'],
  [/gsd-intel-updater/g,               'rapidx-intel-updater'],
  [/gsd-nyquist-auditor/g,             'rapidx-nyquist-auditor'],
  [/gsd-pattern-mapper/g,              'rapidx-pattern-mapper'],
  [/gsd-phase-researcher/g,            'rapidx-phase-researcher'],
  [/gsd-plan-checker/g,                'rapidx-plan-checker'],
  [/gsd-planner/g,                     'rapidx-planner'],
  [/gsd-project-researcher/g,          'rapidx-project-researcher'],
  [/gsd-research-synthesizer/g,        'rapidx-research-synthesizer'],
  [/gsd-roadmapper/g,                  'rapidx-roadmapper'],
  [/gsd-security-auditor/g,            'rapidx-security-auditor'],
  [/gsd-ui-auditor/g,                  'rapidx-ui-auditor'],
  [/gsd-ui-checker/g,                  'rapidx-ui-checker'],
  [/gsd-ui-researcher/g,               'rapidx-ui-researcher'],
  [/gsd-user-profiler/g,               'rapidx-user-profiler'],
  [/gsd-verifier/g,                    'rapidx-verifier'],
  [/gsd-workspaces/g,                  'rapidx-workspaces'],
  [/gsd-local-patches/g,               'rapidx-local-patches'],
  [/gsd-user-files-backup/g,           'rapidx-user-files-backup'],
  [/gsd-tools\b/g,                     'rapidx-tools'],
  // Catch remaining gsd- prefixed identifiers not listed above
  [/\bgsd-([a-z])/g,                   'rapidx-$1'],
  // Path and env rewrites
  [/~\/\.gsd\//g,                      '~/.rapidx/'],
  [/~\/\.gsd\b/g,                      '~/.rapidx'],
  [/commands\/gsd\//g,                 'commands/rapidx/'],
  [/GSD_WORKSTREAM/g,                  'RAPIDX_WORKSTREAM'],
  [/\$\{GSD_WS\}/g,                    '${RAPIDX_WS}'],
  [/\$GSD_WS\b/g,                      '$RAPIDX_WS'],
  [/\bGSD_([A-Z][A-Z0-9_]*)\b/g,       'RAPIDX_$1'],
  [/GSD > /g,                          'RapidX > '],
  // Standalone GSD acronym last to avoid touching compound words
  [/\bGSD\b/g,                         'RapidX'],
];

function rewrite(content) {
  let out = content;
  for (const [pattern, replacement] of REWRITES) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

let fileCount = 0;
let modCount = 0;

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (TEXT_EXTS.has(path.extname(entry.name).toLowerCase())) {
      fileCount++;
      const orig = fs.readFileSync(full, 'utf8');
      const updated = rewrite(orig);
      if (updated !== orig) {
        fs.writeFileSync(full, updated, 'utf8');
        modCount++;
        process.stdout.write(`  patched: ${path.relative(ROOT, full)}\n`);
      }
    }
  }
}

walk(ROOT);
process.stdout.write(`\nDone. Scanned ${fileCount} files, patched ${modCount}.\n`);
