'use strict';

/**
 * RapidX Command — launcher.
 * Starts the shared collector (if not already running) and opens the
 * console in a browser. Mirrors `templates/loop-dashboard/launch.js`'s
 * find-free-port / health-check / detached-spawn pattern, rooted at
 * `__dirname` — since this file lives at `~/.rapidx-command/launch.js`
 * regardless of which repo's `/rapidx:command-center` invoked it, every
 * repo ends up talking to the same instance.
 */

const http = require('http');
const net = require('net');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { execSync } = require('child_process');

const HOME = __dirname;
const STATE_FILE = path.join(HOME, '.state.json');
const SERVER_FILE = path.join(HOME, 'collector.js');
const DEFAULT_PORT = parseInt(process.env.RAPIDX_COMMAND_PORT || '4767', 10);

function readState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch (_) { return null; }
}

function writeState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

function checkHealth(port, timeoutMs) {
  return new Promise((resolve) => {
    const req = http.get({ host: '127.0.0.1', port, path: '/health', timeout: timeoutMs || 800 }, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

function findFreePort(startPort) {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', (err) => {
      if (err.code === 'EADDRINUSE' && startPort < 65535) resolve(findFreePort(startPort + 1));
      else reject(err);
    });
    srv.listen(startPort, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

function openBrowser(url) {
  try {
    if (process.platform === 'win32') execSync(`start "" "${url}"`, { shell: 'cmd.exe' });
    else if (process.platform === 'darwin') execSync(`open "${url}"`);
    else execSync(`xdg-open "${url}"`);
  } catch (_) {
    process.stdout.write(`[RapidX Command] open manually: ${url}\n`);
  }
}

async function ensureRunning() {
  const existing = readState();
  if (existing && existing.port && (await checkHealth(existing.port))) {
    return existing.port;
  }

  const port = await findFreePort(DEFAULT_PORT);
  const child = spawn(process.execPath, [SERVER_FILE], {
    cwd: HOME,
    env: Object.assign({}, process.env, { RAPIDX_COMMAND_PORT: String(port) }),
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  writeState({ pid: child.pid, port, startedAt: new Date().toISOString() });

  for (let i = 0; i < 40; i++) {
    if (await checkHealth(port)) return port;
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error('collector did not become healthy in time');
}

(async () => {
  try {
    const port = await ensureRunning();
    const url = `http://localhost:${port}/`;
    process.stdout.write(`[RapidX Command] console ready at ${url}\n`);
    if (process.argv.includes('--open')) openBrowser(url);
  } catch (err) {
    process.stderr.write(`[RapidX Command] failed to start: ${err.message}\n`);
    process.exit(1);
  }
})();
