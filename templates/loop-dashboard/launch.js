'use strict';

/**
 * RapidX Loop Dashboard — launcher.
 *
 * Starts `server.js` as a fully detached background process (survives after
 * this script exits, independent of whatever invoked it) and, on first
 * start, opens the default browser to it. If a dashboard is already running
 * (tracked via `.state.json` + a live /health check), does nothing but print
 * the existing URL — so re-running /rapidx:loop or /rapidx:loop-status never
 * spawns duplicate servers or pops extra browser tabs.
 *
 * Usage: node launch.js [--open]
 *   --open   also open the default browser, but only on a fresh start.
 */

const { spawn } = require('child_process');
const http = require('http');
const net = require('net');
const fs = require('fs');
const path = require('path');

const DASHBOARD_DIR = __dirname;
const STATE_FILE = path.join(DASHBOARD_DIR, '.state.json');
const SERVER_FILE = path.join(DASHBOARD_DIR, 'server.js');
const DEFAULT_PORT = 4747;
const OPEN = process.argv.includes('--open');

function readState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch (_) { return null; }
}

function writeState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

function checkHealth(port, timeoutMs) {
  return new Promise((resolve) => {
    const req = http.get({ host: '127.0.0.1', port, path: '/health', timeout: timeoutMs }, (res) => {
      resolve(res.statusCode === 200);
      res.resume();
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

function findFreePort(startPort) {
  return new Promise((resolve) => {
    const tryPort = (p) => {
      const probe = net.createServer();
      probe.once('error', () => probe.close(() => tryPort(p + 1)));
      probe.once('listening', () => probe.close(() => resolve(p)));
      probe.listen(p, '127.0.0.1');
    };
    tryPort(startPort);
  });
}

function openBrowser(url) {
  try {
    if (process.platform === 'win32') {
      spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();
    } else if (process.platform === 'darwin') {
      spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
    } else {
      spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
    }
  } catch (_) { /* no GUI available — dashboard is still reachable by URL */ }
}

async function main() {
  const existing = readState();
  if (existing && existing.port && await checkHealth(existing.port, 500)) {
    process.stdout.write(`[RapidX Loop Dashboard] already running -> http://localhost:${existing.port}\n`);
    return;
  }

  const port = await findFreePort(DEFAULT_PORT);
  const child = spawn(process.execPath, [SERVER_FILE], {
    cwd: DASHBOARD_DIR,
    env: Object.assign({}, process.env, { RAPIDX_LOOP_PORT: String(port) }),
    detached: true,
    stdio: 'ignore',
  });
  child.unref();

  writeState({ pid: child.pid, port, startedAt: new Date().toISOString() });

  let healthy = false;
  for (let i = 0; i < 15 && !healthy; i++) {
    await new Promise((r) => setTimeout(r, 300));
    healthy = await checkHealth(port, 500);
  }

  const url = `http://localhost:${port}`;
  process.stdout.write(`[RapidX Loop Dashboard] ${healthy ? 'started' : 'starting'} -> ${url}\n`);
  if (OPEN) openBrowser(url);
}

main();
