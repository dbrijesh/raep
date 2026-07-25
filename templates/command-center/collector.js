'use strict';

/**
 * RapidX Command — Fleet Collector
 * ---------------------------------
 * Zero-dependency Node http server (built-ins only, per project convention).
 * Single shared instance for the whole machine — installed once to
 * `~/.rapidx-command/` (see `seedCommandCenterHome` in
 * `src/install-rapidx-core.js`) regardless of which repo triggers install,
 * so every opted-in repo's hooks POST into the same process and the wall
 * shows the whole fleet, not just one repo.
 *
 * MVP substitute stack (see the command-center plan for the full
 * reasoning): Redis Streams -> in-memory map + `data/events.jsonl` as the
 * permanent record; ClickHouse -> none yet, the JSONL is it; WebSocket
 * fan-out -> Server-Sent Events; Redis control state ->
 * `data/control/<correlation_id>.json`, read directly off disk by
 * `command-gate.js` (no HTTP round trip, survives this process being down).
 *
 * Launched (and kept alive independently of the invoking command) by
 * `launch.js` in this same directory.
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const HOME = __dirname;
const DATA_DIR = path.join(HOME, 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'events.jsonl');
const CONTROL_DIR = path.join(DATA_DIR, 'control');
const ESCALATIONS_FILE = path.join(DATA_DIR, 'escalations.json');
const INDEX_HTML = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

const PORT = parseInt(process.env.RAPIDX_COMMAND_PORT || '4767', 10);
const REPLAY_LINES = 150;
const SILENCE_MS = 8 * 60 * 1000; // matches the spec's `silence` breaker threshold, display-only here

fs.mkdirSync(CONTROL_DIR, { recursive: true });
if (!fs.existsSync(EVENTS_FILE)) fs.writeFileSync(EVENTS_FILE, '', 'utf8');
if (!fs.existsSync(ESCALATIONS_FILE)) fs.writeFileSync(ESCALATIONS_FILE, '[]', 'utf8');

function stripBom(str) {
  return str.charCodeAt(0) === 0xfeff ? str.slice(1) : str;
}

function readJsonSafe(file, fallback) {
  try { return JSON.parse(stripBom(fs.readFileSync(file, 'utf8'))); } catch (_) { return fallback; }
}

// event_type -> wall status. escalation/blocked/resumed can also be
// overridden by control state (paused/killed win over whatever the event
// stream says, since a human action is more authoritative than the agent's
// own narration of itself).
const STATUS_BY_EVENT = {
  session_start: 'build', prompt: 'build', tool_use: 'build', tool_result: 'build',
  decision: 'build', resumed: 'build', phase_complete: 'build',
  verification: 'verify',
  escalation: 'escalated',
  blocked: 'paused',
  session_end: 'done',
  error: 'build',
};

/** In-memory fleet state, rebuilt from events.jsonl on boot, kept live by /events. */
const agents = new Map(); // correlation_id -> agent state
let eventsToday = 0;
let todayKey = new Date().toISOString().slice(0, 10);

function applyEvent(evt) {
  const key = evt.ts ? evt.ts.slice(0, 10) : todayKey;
  if (key !== todayKey) { todayKey = key; eventsToday = 0; }
  eventsToday++;

  const id = evt.correlation_id;
  if (!id) return;
  const prev = agents.get(id) || {
    correlation_id: id, first_ts: evt.ts, events: 0,
    tokens_in: 0, tokens_out: 0,
  };
  const next = Object.assign({}, prev, {
    repo: evt.repo || prev.repo || null,
    branch: evt.branch || prev.branch || null,
    agent_id: evt.agent_id || prev.agent_id || id,
    phase: evt.phase !== undefined ? evt.phase : prev.phase,
    loop: evt.loop !== undefined ? evt.loop : prev.loop,
    last_event_type: evt.event_type,
    last_message: (evt.payload && evt.payload.summary) || prev.last_message || '',
    last_ts: evt.ts,
    events: (prev.events || 0) + 1,
  });
  if (evt.metrics) {
    next.tokens_in = (prev.tokens_in || 0) + (evt.metrics.tokens_in || 0);
    next.tokens_out = (prev.tokens_out || 0) + (evt.metrics.tokens_out || 0);
  }
  const control = readControl(id);
  if (control && control.status === 'paused') next.status = 'paused';
  else if (control && control.status === 'killed') next.status = 'paused';
  else next.status = STATUS_BY_EVENT[evt.event_type] || prev.status || 'build';
  agents.set(id, next);

  if (evt.event_type === 'escalation') addEscalation(evt);
}

function replayFromDisk() {
  let raw = '';
  try { raw = fs.readFileSync(EVENTS_FILE, 'utf8'); } catch (_) { return; }
  raw.split('\n').filter(Boolean).forEach((line) => {
    try { applyEvent(JSON.parse(line)); } catch (_) { /* skip malformed line */ }
  });
}
replayFromDisk();

function readControl(correlationId) {
  return readJsonSafe(path.join(CONTROL_DIR, `${correlationId}.json`), null);
}

function writeControl(correlationId, status, reason) {
  const file = path.join(CONTROL_DIR, `${correlationId}.json`);
  fs.writeFileSync(file, JSON.stringify({
    correlation_id: correlationId, status, reason, updated_at: new Date().toISOString(),
  }, null, 2), 'utf8');
}

function readEscalations() {
  return readJsonSafe(ESCALATIONS_FILE, []);
}

function addEscalation(evt) {
  const list = readEscalations();
  list.push({
    id: evt.event_id || crypto.randomUUID(),
    correlation_id: evt.correlation_id,
    agent_id: evt.agent_id,
    repo: evt.repo,
    question: (evt.payload && (evt.payload.question || evt.payload.summary)) || 'Agent is waiting on a decision.',
    context: (evt.payload && evt.payload.context) || '',
    options: (evt.payload && evt.payload.options) || [],
    ts: evt.ts,
    resolved: false,
    answer: null,
  });
  fs.writeFileSync(ESCALATIONS_FILE, JSON.stringify(list, null, 2), 'utf8');
}

function resolveEscalation(id, answer) {
  const list = readEscalations();
  const found = list.find((e) => e.id === id);
  if (!found) return null;
  found.resolved = true;
  found.answer = answer;
  found.answered_at = new Date().toISOString();
  fs.writeFileSync(ESCALATIONS_FILE, JSON.stringify(list, null, 2), 'utf8');
  return found;
}

function appendEvent(evt) {
  fs.appendFileSync(EVENTS_FILE, JSON.stringify(evt) + '\n', 'utf8');
}

function buildState() {
  const now = Date.now();
  const list = Array.from(agents.values()).map((a) => {
    const elapsedMs = a.last_ts ? now - Date.parse(a.last_ts) : 0;
    const silent = elapsedMs > SILENCE_MS && (a.status === 'build' || a.status === 'verify');
    return Object.assign({}, a, {
      status: silent ? 'silent' : a.status,
      silent_ms: silent ? elapsedMs : 0,
    });
  }).sort((x, y) => (Date.parse(y.last_ts || 0) - Date.parse(x.last_ts || 0)));

  const escalations = readEscalations().filter((e) => !e.resolved);
  const running = list.filter((a) => ['build', 'verify', 'escalated', 'silent'].includes(a.status)).length;

  return {
    agents: list,
    escalations,
    kpis: {
      running,
      awaiting: escalations.length,
      events_today: eventsToday,
      tokens_observed: list.reduce((s, a) => s + (a.tokens_in || 0) + (a.tokens_out || 0), 0),
    },
  };
}

const clients = new Set();
function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) res.write(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 1e6) req.destroy(); });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function sendJson(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

// ── Optional Azure Blob Storage mirror ────────────────────────────────────
// Rolled-up snapshot only (agents + kpis + recent events), never the full
// event firehose, so this stays cheap. No SDK: a SAS URL already carries
// auth, Blob's REST API just needs the x-ms-blob-type header on a PUT.
const AZURE_CONFIG_FILE = path.join(HOME, 'azure-config.json');
function resolveAzureSasUrl() {
  if (process.env.RAPIDX_COMMAND_AZURE_SAS_URL) return process.env.RAPIDX_COMMAND_AZURE_SAS_URL;
  const cfg = readJsonSafe(AZURE_CONFIG_FILE, null);
  return (cfg && cfg.sas_url) || '';
}
const AZURE_SAS_URL = resolveAzureSasUrl();
function mirrorToAzure() {
  if (!AZURE_SAS_URL) return;
  let recent = [];
  try {
    const raw = fs.readFileSync(EVENTS_FILE, 'utf8').split('\n').filter(Boolean);
    recent = raw.slice(-50).map((l) => { try { return JSON.parse(l); } catch (_) { return null; } }).filter(Boolean);
  } catch (_) { /* no events yet */ }

  const snapshot = Object.assign({ updated_at: new Date().toISOString(), recent_events: recent }, buildState());
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

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(INDEX_HTML);
    return;
  }

  if (req.method === 'GET' && url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/state') {
    sendJson(res, 200, buildState());
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write('\n');
    clients.add(res);
    let raw = '';
    try { raw = fs.readFileSync(EVENTS_FILE, 'utf8'); } catch (_) { /* none yet */ }
    raw.split('\n').filter(Boolean).slice(-REPLAY_LINES).forEach((line) => {
      res.write(`event: agent_event\ndata: ${line}\n\n`);
    });
    res.write(`event: state\ndata: ${JSON.stringify(buildState())}\n\n`);
    req.on('close', () => clients.delete(res));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/events') {
    const body = await readBody(req);
    let evt;
    try { evt = JSON.parse(body); } catch (_) { sendJson(res, 400, { error: 'invalid json' }); return; }
    if (!evt.correlation_id || !evt.event_type) { sendJson(res, 400, { error: 'missing correlation_id/event_type' }); return; }
    evt.schema = evt.schema || 'rapidx.agent.event/v1';
    evt.event_id = evt.event_id || crypto.randomUUID();
    evt.received_at = new Date().toISOString();
    evt.ts = evt.ts || evt.received_at;
    appendEvent(evt);
    applyEvent(evt);
    broadcast('agent_event', evt);
    broadcast('state', buildState());
    sendJson(res, 202, { ok: true });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/control') {
    const body = await readBody(req);
    let payload;
    try { payload = JSON.parse(body); } catch (_) { sendJson(res, 400, { error: 'invalid json' }); return; }
    const { correlation_id, action, reason } = payload || {};
    if (!correlation_id || !['hold', 'resume', 'kill'].includes(action)) {
      sendJson(res, 400, { error: 'expected { correlation_id, action: hold|resume|kill }' });
      return;
    }
    const status = action === 'hold' ? 'paused' : action === 'kill' ? 'killed' : 'running';
    const defaultReason = action === 'hold'
      ? 'Fleet control has paused this run pending human review. Do not retry; wait for resume.'
      : action === 'kill'
        ? 'Fleet control has stopped this run from the console. Do not retry any further tool calls.'
        : null;
    writeControl(correlation_id, status, reason || defaultReason);

    const synthetic = {
      schema: 'rapidx.agent.event/v1', event_id: crypto.randomUUID(),
      ts: new Date().toISOString(), correlation_id, tool: 'rapidx-command',
      agent_id: 'fleet-control', event_type: action === 'resume' ? 'resumed' : 'blocked',
      status: 'ok', actor: 'human',
      payload: { summary: `${action.toUpperCase()} issued from the command center console.` },
    };
    appendEvent(synthetic);
    applyEvent(synthetic);
    broadcast('agent_event', synthetic);
    broadcast('state', buildState());
    sendJson(res, 200, { ok: true });
    return;
  }

  const escMatch = url.pathname.match(/^\/api\/escalations\/([^/]+)\/answer$/);
  if (req.method === 'POST' && escMatch) {
    const body = await readBody(req);
    let payload;
    try { payload = JSON.parse(body); } catch (_) { sendJson(res, 400, { error: 'invalid json' }); return; }
    const resolved = resolveEscalation(escMatch[1], payload && payload.answer);
    if (!resolved) { sendJson(res, 404, { error: 'escalation not found' }); return; }

    const synthetic = {
      schema: 'rapidx.agent.event/v1', event_id: crypto.randomUUID(),
      ts: new Date().toISOString(), correlation_id: resolved.correlation_id, tool: 'rapidx-command',
      agent_id: 'fleet-control', event_type: 'decision', status: 'ok', actor: 'human',
      payload: { summary: `Operator decision recorded: "${resolved.answer}". This is an audit record only — it does not yet auto-resume the agent (no ask_operator MCP tool wired up in this MVP).` },
    };
    appendEvent(synthetic);
    applyEvent(synthetic);
    broadcast('agent_event', synthetic);
    broadcast('state', buildState());
    sendJson(res, 200, { ok: true, escalation: resolved });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('not found');
});

server.listen(PORT, () => {
  process.stdout.write(`[RapidX Command] collector listening on http://localhost:${PORT}\n`);
});
