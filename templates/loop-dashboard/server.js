'use strict';

/**
 * RapidX Loop — Live Progress Dashboard Server
 * ---------------------------------------------
 * Zero-dependency Node http server (built-ins only, per project convention).
 * Serves a single self-contained HTML page and streams build progress via
 * Server-Sent Events, tailing `.rapidx/loop/progress.jsonl` and polling
 * `.rapidx/loop/manifest.json` so the page updates itself as agents work
 * through the /rapidx:loop pipeline — no manual refresh needed.
 *
 * Launched (and kept alive independently of the invoking command) by
 * `launch.js` in this same directory. Not meant to be run manually, though
 * `node server.js` works fine for local testing (defaults to port 4747).
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

const LOOP_DIR = path.resolve(__dirname, '..');
const PROGRESS_FILE = path.join(LOOP_DIR, 'progress.jsonl');
const MANIFEST_FILE = path.join(LOOP_DIR, 'manifest.json');
const SPEC_FILE = path.join(LOOP_DIR, 'spec.md');
const ARCH_FILE = path.join(LOOP_DIR, 'architecture.md');
const ARCH_JSON_FILE = path.join(LOOP_DIR, 'architecture.json');
const PLAN_FILE = path.join(LOOP_DIR, 'plan.md');
const TOKENS_FILE = path.join(LOOP_DIR, 'tokens.json');
const INDEX_HTML = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

const PORT = parseInt(process.env.RAPIDX_LOOP_PORT || '4747', 10);

function stripBom(str) {
  return str.charCodeAt(0) === 0xfeff ? str.slice(1) : str;
}

function readJsonSafe(file, fallback) {
  try { return JSON.parse(stripBom(fs.readFileSync(file, 'utf8'))); } catch (_) { return fallback; }
}

function readTextSafe(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch (_) { return null; }
}

function readProgressLines() {
  const raw = readTextSafe(PROGRESS_FILE);
  if (!raw) return [];
  return raw
    .split('\n')
    .filter(Boolean)
    .map((line) => { try { return JSON.parse(line); } catch (_) { return null; } })
    .filter(Boolean);
}

function extractTitle(specText) {
  if (!specText) return null;
  const m = specText.match(/^#\s*Frozen Spec:\s*(.+)$/m);
  return m ? m[1].trim() : null;
}

// Best-effort markdown-table parse of architecture.md's "Service Topology"
// table, used only as a fallback when architecture.json isn't present yet.
// Never fatal if the shape drifts — the dashboard just shows nothing for
// that panel until one of the two files matches an expected format.
function extractServicesFromMarkdown(archText) {
  if (!archText) return [];
  const services = [];
  for (const line of archText.split('\n')) {
    const m = line.match(/^\|\s*([\w.-]+)\s*\|\s*([^|]+)\|\s*([^|]+)\|/);
    if (m && m[1] !== 'Service' && !/^-+$/.test(m[1])) {
      services.push({ name: m[1].trim(), type: m[2].trim(), responsibility: m[3].trim() });
    }
  }
  return services;
}

// architecture.json is the primary source — a machine-readable sidecar
// written by loop-architecture-planner alongside architecture.md, so the
// dashboard doesn't depend on regex-parsing LLM-authored markdown.
function extractServices(archJson, archText) {
  if (archJson && Array.isArray(archJson.services) && archJson.services.length) {
    return archJson.services;
  }
  return extractServicesFromMarkdown(archText);
}

function buildState() {
  const manifest = readJsonSafe(MANIFEST_FILE, { spec_frozen: false, current_phase: null, phases: [] });
  const specText = readTextSafe(SPEC_FILE);
  const archText = readTextSafe(ARCH_FILE);
  const archJson = readJsonSafe(ARCH_JSON_FILE, null);
  const services = extractServices(archJson, archText);
  const total = manifest.phases.length;
  const verified = manifest.phases.filter((p) => p.status === 'verified').length;
  const blocked = manifest.phases.filter((p) => p.status === 'blocked').length;
  const tokensRaw = readJsonSafe(TOKENS_FILE, null);
  // Strip the hook's private bookkeeping (_offsets) before it ever reaches a client.
  const tokens = tokensRaw
    ? { updated_at: tokensRaw.updated_at, current_phase: tokensRaw.current_phase, total: tokensRaw.total, by_phase: tokensRaw.by_phase }
    : null;

  return {
    manifest,
    services,
    title: extractTitle(specText),
    specExists: !!specText,
    planExists: fs.existsSync(PLAN_FILE),
    totals: { total, verified, blocked },
    progressCount: total ? Math.round((verified / total) * 100) : (manifest.spec_frozen ? 5 : 0),
    tokens,
  };
}

const clients = new Set();
let lastSize = fs.existsSync(PROGRESS_FILE) ? fs.statSync(PROGRESS_FILE).size : 0;

function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) res.write(payload);
}

function pollProgress() {
  try {
    const stat = fs.statSync(PROGRESS_FILE);
    if (stat.size > lastSize) {
      const fd = fs.openSync(PROGRESS_FILE, 'r');
      const len = stat.size - lastSize;
      const buf = Buffer.alloc(len);
      fs.readSync(fd, buf, 0, len, lastSize);
      fs.closeSync(fd);
      lastSize = stat.size;
      buf.toString('utf8').split('\n').filter(Boolean).forEach((line) => {
        try { broadcast('progress', JSON.parse(line)); } catch (_) { /* skip malformed line */ }
      });
    } else if (stat.size < lastSize) {
      lastSize = 0; // file rotated/truncated — resend from the top next tick
    }
  } catch (_) { /* progress.jsonl not created yet */ }
}

setInterval(() => {
  pollProgress();
  broadcast('state', buildState());
}, 1500);

// ── Optional Azure Blob Storage mirror ────────────────────────────────────
// Same shape as the command center's mirror: rolled-up snapshot only, no
// SDK (a SAS URL already carries auth; Blob's REST API just needs the
// x-ms-blob-type header on a PUT). The SAS URL can come from an env var
// (set once per session) or a shared home-dir config file (persists across
// restarts without needing a shell profile edit) — every /rapidx:loop
// engagement on this machine mirrors to the same blob unless overridden.
const AZURE_CONFIG_FILE = path.join(os.homedir(), '.rapidx-loop-azure.json');
function resolveAzureSasUrl() {
  if (process.env.RAPIDX_LOOP_AZURE_SAS_URL) return process.env.RAPIDX_LOOP_AZURE_SAS_URL;
  const cfg = readJsonSafe(AZURE_CONFIG_FILE, null);
  return (cfg && cfg.sas_url) || '';
}
const AZURE_SAS_URL = resolveAzureSasUrl();

function mirrorToAzure() {
  if (!AZURE_SAS_URL) return;
  const snapshot = Object.assign({ updated_at: new Date().toISOString() }, buildState());
  const body = Buffer.from(JSON.stringify(snapshot));
  let url;
  try { url = new URL(AZURE_SAS_URL); } catch (_) { return; }

  const req = https.request({
    hostname: url.hostname,
    path: url.pathname + url.search,
    method: 'PUT',
    family: 4, // some networks have broken/unreachable IPv6 routes to Azure; IPv4 is the safe default
    headers: {
      'x-ms-blob-type': 'BlockBlob',
      'Content-Type': 'application/json',
      'Content-Length': body.length,
    },
    timeout: 5000,
  }, (res) => { res.resume(); });
  req.on('error', () => { /* mirror failures never affect local operation */ });
  req.on('timeout', () => req.destroy());
  req.write(body);
  req.end();
}
if (AZURE_SAS_URL) setInterval(mirrorToAzure, 45000);

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(INDEX_HTML);
    return;
  }

  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
    return;
  }

  if (req.url === '/api/state') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(buildState()));
    return;
  }

  if (req.url === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write('\n');
    clients.add(res);
    readProgressLines().forEach((evt) => res.write(`event: progress\ndata: ${JSON.stringify(evt)}\n\n`));
    res.write(`event: state\ndata: ${JSON.stringify(buildState())}\n\n`);
    req.on('close', () => clients.delete(res));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('not found');
});

server.listen(PORT, () => {
  process.stdout.write(`[RapidX Loop Dashboard] listening on http://localhost:${PORT}\n`);
});
