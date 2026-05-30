#!/usr/bin/env node
'use strict';

/**
 * RapidX Codebase Knowledge Graph Builder
 * ---------------------------------------
 * Builds a code knowledge graph (à la GitNexus) from the current repository
 * using ONLY Node.js built-ins — no tree-sitter, no graph database, no npm
 * dependencies. Produces three artifacts under `.rapidx/knowledge/`:
 *
 *   graph.json        — { nodes, edges } (queried by graph-query.cjs / agents)
 *   graph.html        — self-contained interactive force-directed viewer
 *   GRAPH_REPORT.md    — human summary (hub modules, layers, orphans, metrics)
 *
 * Node kinds:  file | module | class | function
 * Edge kinds:  contains | imports | calls | extends
 *
 * Optional upgrade: if the external `graphify` CLI is installed (the GitNexus-
 * style Python tool) and `--rich` is passed, we shell out to it for a deeper
 * graph and merge the artifacts. Native build is always the default and always
 * works offline.
 *
 * Usage:
 *   node scripts/build-knowledge-graph.js [--rich] [--max <n>] [--quiet]
 *   npx rapidx-platform --graph
 */

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const cwd = process.cwd();
const args = process.argv.slice(2);
const flags = {
  rich: args.includes('--rich'),
  quiet: args.includes('--quiet'),
  max: args.includes('--max') ? parseInt(args[args.indexOf('--max') + 1], 10) : 1500,
};

const outDir = path.join(cwd, '.rapidx', 'knowledge');
const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'coverage', '.next', 'out',
  '__pycache__', 'vendor', '.rapidx', '.venv', 'target', '.idea', '.vscode',
]);

const LANGS = {
  '.ts': 'ts', '.tsx': 'ts', '.js': 'js', '.jsx': 'js', '.mjs': 'js', '.cjs': 'js',
  '.py': 'py', '.go': 'go', '.java': 'java', '.cs': 'cs', '.rb': 'rb', '.php': 'php', '.rs': 'rs',
};

function log(m) { if (!flags.quiet) process.stdout.write(`[RapidX] ${m}\n`); }
function err(m) { process.stderr.write(`[RapidX] ERROR: ${m}\n`); }
function rel(p) { return path.relative(cwd, p).split(path.sep).join('/'); }

// ─── Discovery ──────────────────────────────────────────────────────────────

function listSourceFiles() {
  const files = [];
  function walk(dir) {
    if (files.length >= flags.max) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (files.length >= flags.max) break;
      if (SKIP_DIRS.has(e.name) || (e.name.startsWith('.') && e.name !== '.github')) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (LANGS[path.extname(e.name)]) files.push(full);
    }
  }
  walk(cwd);
  return files;
}

// ─── Extractors (heuristic, regex-based, per language) ────────────────────────

const RE = {
  // imports
  jsImport: /(?:import\s+(?:[\w*{}\s,]+\s+from\s+)?|require\(\s*|export\s+[\w*{}\s,]+\s+from\s+)['"]([^'"]+)['"]/g,
  pyImport: /^\s*(?:from\s+([\w.]+)\s+import|import\s+([\w.]+))/gm,
  goImport: /(?:^|\n)\s*(?:import\s+)?"([\w./-]+)"/g,
  javaImport: /^\s*import\s+(?:static\s+)?([\w.]+)\s*;/gm,
  // definitions
  jsFunc: /(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)|(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(/g,
  jsClass: /(?:export\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)(?:\s+extends\s+([A-Za-z_$][\w$.]*))?/g,
  pyFunc: /^\s*def\s+([A-Za-z_][\w]*)\s*\(/gm,
  pyClass: /^\s*class\s+([A-Za-z_][\w]*)\s*(?:\(([^)]*)\))?/gm,
  goFunc: /func\s+(?:\([^)]*\)\s*)?([A-Za-z_]\w*)\s*\(/g,
  goType: /type\s+([A-Za-z_]\w*)\s+(?:struct|interface)\b/g,
  javaClass: /(?:public|private|protected)?\s*(?:abstract\s+|final\s+)?class\s+([A-Za-z_]\w*)(?:\s+extends\s+([A-Za-z_][\w.]*))?/g,
  javaMethod: /(?:public|private|protected)\s+(?:static\s+)?[\w<>\[\]]+\s+([A-Za-z_]\w*)\s*\(/g,
};

function extract(content, lang) {
  const imports = new Set();
  const classes = []; // { name, extends }
  const functions = new Set();

  const collect = (re, fn) => { let m; re.lastIndex = 0; while ((m = re.exec(content)) !== null) fn(m); };

  if (lang === 'ts' || lang === 'js') {
    collect(RE.jsImport, m => imports.add(m[1]));
    collect(RE.jsClass, m => classes.push({ name: m[1], ext: m[2] || null }));
    collect(RE.jsFunc, m => { const n = m[1] || m[2]; if (n) functions.add(n); });
  } else if (lang === 'py') {
    collect(RE.pyImport, m => imports.add(m[1] || m[2]));
    collect(RE.pyClass, m => classes.push({ name: m[1], ext: (m[2] || '').split(',')[0].trim() || null }));
    collect(RE.pyFunc, m => functions.add(m[1]));
  } else if (lang === 'go') {
    collect(RE.goImport, m => imports.add(m[1]));
    collect(RE.goType, m => classes.push({ name: m[1], ext: null }));
    collect(RE.goFunc, m => functions.add(m[1]));
  } else if (lang === 'java' || lang === 'cs') {
    collect(RE.javaImport, m => imports.add(m[1]));
    collect(RE.javaClass, m => classes.push({ name: m[1], ext: m[2] || null }));
    collect(RE.javaMethod, m => functions.add(m[1]));
  }
  return { imports: [...imports].filter(Boolean), classes, functions: [...functions] };
}

// ─── Resolve an import specifier to an in-repo file node id ───────────────────

function resolveImport(spec, fromFile, fileIndex) {
  if (!spec) return null;
  // Relative path import (JS/TS)
  if (spec.startsWith('.')) {
    const base = path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), spec));
    const candidates = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.js'].map(s => base + s);
    for (const c of candidates) if (fileIndex.has(c)) return c;
    return null;
  }
  // Dotted module (py/java) → try mapping to a file path
  const asPath = spec.replace(/\./g, '/');
  for (const ext of ['.py', '.java', '.go', '']) {
    if (fileIndex.has(asPath + ext)) return asPath + ext;
  }
  return null; // external dependency — represented as a module node
}

// ─── Build graph ──────────────────────────────────────────────────────────────

function buildNativeGraph() {
  const files = listSourceFiles();
  log(`Scanning ${files.length} source files…`);

  const nodes = new Map(); // id → node
  const edges = [];
  const fileIndex = new Set(files.map(rel));
  const addNode = (id, type, extra = {}) => { if (!nodes.has(id)) nodes.set(id, { id, type, label: extra.label || id.split('/').pop(), ...extra }); };
  const addEdge = (source, target, label) => edges.push({ source, target, label });

  const externalModules = new Set();

  for (const abs of files) {
    const relPath = rel(abs);
    const lang = LANGS[path.extname(abs)];
    let content;
    try { content = fs.readFileSync(abs, 'utf8'); } catch { continue; }
    if (content.length > 400000) continue; // skip huge generated files

    const layer = relPath.split('/').slice(0, 2).join('/');
    addNode(relPath, 'file', { label: relPath, lang, layer, loc: content.split('\n').length });

    const { imports, classes, functions } = extract(content, lang);

    for (const spec of imports) {
      const resolved = resolveImport(spec, relPath, fileIndex);
      if (resolved) {
        addEdge(relPath, resolved, 'imports');
      } else {
        const modId = `module:${spec.split('/')[0]}`;
        addNode(modId, 'module', { label: spec.split('/')[0], external: true });
        externalModules.add(spec.split('/')[0]);
        addEdge(relPath, modId, 'imports');
      }
    }

    for (const c of classes) {
      const cid = `${relPath}#${c.name}`;
      addNode(cid, 'class', { label: c.name, file: relPath });
      addEdge(relPath, cid, 'contains');
      if (c.ext) addEdge(cid, `class:${c.ext}`, 'extends'), addNode(`class:${c.ext}`, 'class', { label: c.ext, unresolved: true });
    }
    for (const fn of functions.slice(0, 60)) {
      const fid = `${relPath}#${fn}()`;
      addNode(fid, 'function', { label: fn + '()', file: relPath });
      addEdge(relPath, fid, 'contains');
    }
  }

  const graph = {
    version: 1,
    generator: 'rapidx-native',
    built: new Date().toISOString(),
    root: path.basename(cwd),
    stats: {
      files: [...nodes.values()].filter(n => n.type === 'file').length,
      classes: [...nodes.values()].filter(n => n.type === 'class' && !n.unresolved).length,
      functions: [...nodes.values()].filter(n => n.type === 'function').length,
      externalModules: externalModules.size,
    },
    nodes: [...nodes.values()],
    edges,
  };
  return graph;
}

// ─── Optional graphify (GitNexus-style) upgrade ───────────────────────────────

function tryRichGraph() {
  const probe = childProcess.spawnSync('graphify', ['--help'], { encoding: 'utf8', timeout: 5000 });
  if (probe.error) {
    log('graphify CLI not found — using native graph. Install for richer graphs: uv pip install graphifyy && graphify install');
    return null;
  }
  log('graphify CLI detected — building rich graph (this may take a while)…');
  const res = childProcess.spawnSync('graphify', ['build', '--out', 'graphify-out'], { cwd, encoding: 'utf8', timeout: 300000 });
  if (res.status !== 0) { err('graphify build failed; falling back to native graph.'); return null; }
  const richPath = path.join(cwd, 'graphify-out', 'graph.json');
  try { return JSON.parse(fs.readFileSync(richPath, 'utf8')); } catch { return null; }
}

// ─── Report + HTML ─────────────────────────────────────────────────────────────

function degreeMap(graph) {
  const deg = {};
  for (const n of graph.nodes) deg[n.id] = { in: 0, out: 0 };
  for (const e of graph.edges) {
    if (deg[e.source]) deg[e.source].out++;
    if (deg[e.target]) deg[e.target].in++;
  }
  return deg;
}

function buildReport(graph) {
  const deg = degreeMap(graph);
  const files = graph.nodes.filter(n => n.type === 'file');
  const hubs = files.map(f => ({ id: f.id, deg: (deg[f.id].in + deg[f.id].out), in: deg[f.id].in })).sort((a, b) => b.deg - a.deg).slice(0, 12);
  const mostImported = files.map(f => ({ id: f.id, in: deg[f.id].in })).sort((a, b) => b.in - a.in).slice(0, 10);
  const orphans = files.filter(f => deg[f.id].in === 0 && deg[f.id].out === 0).slice(0, 20);
  const externals = graph.nodes.filter(n => n.type === 'module').map(n => ({ id: n.id, in: deg[n.id].in })).sort((a, b) => b.in - a.in).slice(0, 15);

  return `# Codebase Knowledge Graph — Report

**Built**: ${graph.built}
**Generator**: ${graph.generator}
**Root**: ${graph.root}

## Metrics

- Files: **${graph.stats.files}**
- Classes/Types: **${graph.stats.classes}**
- Functions/Methods: **${graph.stats.functions}**
- External modules: **${graph.stats.externalModules}**
- Edges: **${graph.edges.length}**

## Hub modules (highest coupling)

${hubs.map(h => `- \`${h.id}\` — degree ${h.deg} (imported by ${h.in})`).join('\n') || '_none_'}

## Most-imported files (core abstractions)

${mostImported.map(m => `- \`${m.id}\` — imported ${m.in}×`).join('\n') || '_none_'}

## Top external dependencies

${externals.map(e => `- \`${e.id.replace('module:', '')}\` — used by ${e.in} files`).join('\n') || '_none_'}

## Potential orphans (no imports in or out)

${orphans.map(o => `- \`${o.id}\``).join('\n') || '_none_'}

## Notes for AI agents

1. Treat **hub modules** as high-blast-radius — changes there ripple widely.
2. **Most-imported files** define core contracts; preserve their interfaces.
3. Query this graph for impact analysis before edits:
   \`node .rapidx/hooks/lib/graph-query.cjs <term>\`
4. Open \`.rapidx/knowledge/graph.html\` for an interactive view.

---
*Regenerate with: \`/rapidx:knowledge-graph\` or \`node scripts/build-knowledge-graph.js\`*
`;
}

function buildHtml(graph) {
  // Self-contained force-directed viewer — no external scripts/CDNs.
  const data = JSON.stringify({ nodes: graph.nodes, edges: graph.edges });
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>RapidX Knowledge Graph — ${graph.root}</title>
<style>
  html,body{margin:0;height:100%;background:#0b0e14;color:#cdd6f4;font:13px system-ui,sans-serif;overflow:hidden}
  #hud{position:fixed;top:10px;left:10px;z-index:10;background:#161b22cc;padding:10px 14px;border:1px solid #30363d;border-radius:8px;max-width:320px}
  #hud h1{font-size:14px;margin:0 0 6px}#hud input{width:100%;background:#0b0e14;border:1px solid #30363d;color:#cdd6f4;padding:5px;border-radius:5px}
  .legend span{display:inline-block;margin-right:10px}.dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:4px;vertical-align:middle}
  canvas{display:block}
</style></head><body>
<div id="hud"><h1>RapidX Knowledge Graph</h1>
<div>${graph.stats.files} files · ${graph.stats.classes} classes · ${graph.edges.length} edges</div>
<input id="q" placeholder="filter nodes (substring)…"/>
<div class="legend" style="margin-top:8px">
<span><i class="dot" style="background:#89b4fa"></i>file</span>
<span><i class="dot" style="background:#f9e2af"></i>class</span>
<span><i class="dot" style="background:#a6e3a1"></i>fn</span>
<span><i class="dot" style="background:#f38ba8"></i>module</span></div>
<div style="margin-top:6px;opacity:.7">drag to pan · scroll to zoom · click node to focus</div></div>
<canvas id="c"></canvas>
<script>
const G=${data};
const COLORS={file:'#89b4fa',class:'#f9e2af',function:'#a6e3a1',module:'#f38ba8'};
const cv=document.getElementById('c'),ctx=cv.getContext('2d');
let W,H;function size(){W=cv.width=innerWidth;H=cv.height=innerHeight;}size();onresize=size;
const N=G.nodes.map((n,i)=>({...n,x:Math.cos(i)*300+W/2,y:Math.sin(i*1.3)*300+H/2,vx:0,vy:0}));
const idx=Object.fromEntries(N.map(n=>[n.id,n]));
const E=G.edges.filter(e=>idx[e.source]&&idx[e.target]);
let view={x:0,y:0,k:1},focus=null,filter='';
document.getElementById('q').oninput=e=>filter=e.target.value.toLowerCase();
// simple force simulation
function step(){
 for(const n of N){n.vx*=.9;n.vy*=.9;}
 for(let i=0;i<N.length;i++)for(let j=i+1;j<N.length;j++){
   const a=N[i],b=N[j];let dx=a.x-b.x,dy=a.y-b.y,d=Math.hypot(dx,dy)||1;
   if(d<260){const f=(260-d)/d*0.04;a.vx+=dx*f;a.vy+=dy*f;b.vx-=dx*f;b.vy-=dy*f;}}
 for(const e of E){const a=idx[e.source],b=idx[e.target];let dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1;const f=(d-90)*0.002;a.vx+=dx*f;a.vy+=dy*f;b.vx-=dx*f;b.vy-=dy*f;}
 for(const n of N){const dx=W/2-n.x,dy=H/2-n.y;n.vx+=dx*0.0008;n.vy+=dy*0.0008;n.x+=n.vx;n.y+=n.vy;}
}
function draw(){
 ctx.setTransform(view.k,0,0,view.k,view.x,view.y);ctx.clearRect(-view.x/view.k,-view.y/view.k,W/view.k,H/view.k);
 ctx.strokeStyle='#30363d55';ctx.lineWidth=1/view.k;
 for(const e of E){const a=idx[e.source],b=idx[e.target];ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
 for(const n of N){const hit=filter&&n.id.toLowerCase().includes(filter);
   ctx.beginPath();const r=(n.type==='file'?5:3)+ (hit?3:0);ctx.arc(n.x,n.y,r,0,7);
   ctx.fillStyle=filter&&!hit?'#39414d':(COLORS[n.type]||'#cdd6f4');ctx.fill();
   if(view.k>1.4||hit){ctx.fillStyle='#cdd6f4';ctx.font=(11/view.k)+'px sans-serif';ctx.fillText(n.label,n.x+6,n.y+3);}}
}
function loop(){step();draw();requestAnimationFrame(loop);}loop();
let drag=false,px,py;
cv.onmousedown=e=>{drag=true;px=e.clientX;py=e.clientY;};
onmouseup=()=>drag=false;
onmousemove=e=>{if(drag){view.x+=e.clientX-px;view.y+=e.clientY-py;px=e.clientX;py=e.clientY;}};
cv.onwheel=e=>{e.preventDefault();const s=e.deltaY<0?1.1:0.9;view.k*=s;view.x=e.clientX-(e.clientX-view.x)*s;view.y=e.clientY-(e.clientY-view.y)*s;};
</script></body></html>`;
}

// ─── Diff snapshot ──────────────────────────────────────────────────────────────

function writeSnapshot(graph) {
  const snap = { ts: graph.built, nodes: graph.nodes.map(n => n.id), edges: graph.edges.map(e => `${e.source}>${e.target}:${e.label}`) };
  fs.writeFileSync(path.join(outDir, '.graph-snapshot.json'), JSON.stringify(snap), 'utf8');
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  fs.mkdirSync(outDir, { recursive: true });
  let graph = null;
  if (flags.rich) graph = tryRichGraph();
  if (!graph) graph = buildNativeGraph();

  fs.writeFileSync(path.join(outDir, 'graph.json'), JSON.stringify(graph, null, 2), 'utf8');
  fs.writeFileSync(path.join(outDir, 'GRAPH_REPORT.md'), buildReport(graph), 'utf8');
  fs.writeFileSync(path.join(outDir, 'graph.html'), buildHtml(graph), 'utf8');
  writeSnapshot(graph);

  log('Knowledge graph built:');
  log(`  .rapidx/knowledge/graph.json   (${graph.nodes.length} nodes, ${graph.edges.length} edges)`);
  log('  .rapidx/knowledge/GRAPH_REPORT.md');
  log('  .rapidx/knowledge/graph.html   (open in a browser)');
  log('  Next: /rapidx:invariant-catalog (seed invariants) or /rapidx:fine-tune (apply to agents)');
}

main();
