import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { spawn } from 'node:child_process';
import net from 'node:net';
import { dirname, extname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AmigoError } from './format.mjs';
import {
  dashboardStatusPayload,
  httpStatusFor,
  projectIsRunning,
  startProject,
  stopProject,
} from './lifecycle.mjs';
import { isAlive, killTree, probeHealth, spawnDetached } from './process.mjs';
import {
  DASHBOARD_HOST,
  DASHBOARD_NAME,
  clearRunRecord,
  dashboardPort,
  logPath,
  readRunRecord,
  writeRunRecord,
} from './studio.mjs';

const studioCodeRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT_NAME = /^[a-z0-9][a-z0-9._-]*$/i;
const MIME = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};
const FALLBACK_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Amigo</title></head>
<body>
<p>Dashboard UI is not built. From the studio root run <code>npm run dashboard:build</code>, then refresh.</p>
</body></html>
`;

export function dashboardDistDir() {
  return join(studioCodeRoot, 'dashboard', 'dist');
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
  });
  res.end(body);
}

function quoteCmd(p) {
  return `"${String(p).replace(/"/g, '')}"`;
}

export function dashboardUrl(port = dashboardPort()) {
  return `http://${DASHBOARD_HOST}:${port}/`;
}

export function listenLoopback(server, port) {
  return new Promise((resolve, reject) => {
    const onError = (err) => {
      server.off('listening', onListen);
      reject(err);
    };
    const onListen = () => {
      server.off('error', onError);
      resolve(server.address());
    };
    server.once('error', onError);
    server.listen(port, DASHBOARD_HOST, onListen);
  });
}

export function probeTcp(host, port, timeoutMs = 400) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    const t = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, timeoutMs);
    socket.once('connect', () => {
      clearTimeout(t);
      socket.end();
      resolve(true);
    });
    socket.once('error', () => {
      clearTimeout(t);
      resolve(false);
    });
  });
}

export async function waitForDashboard(port, tries = 50) {
  const url = `http://${DASHBOARD_HOST}:${port}/`;
  for (let i = 0; i < tries; i++) {
    const health = await probeHealth(url, 800);
    if (health === 'ok') return true;
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
}

export function openBrowser(url) {
  if (process.platform === 'win32') {
    spawn(process.env.ComSpec || 'cmd.exe', ['/c', 'start', '', url], {
      detached: true,
      stdio: 'ignore',
    }).unref();
    return;
  }
  spawn(process.platform === 'darwin' ? 'open' : 'xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
}

export function createDashboardServer(root, opts = {}) {
  return createServer((req, res) => {
    Promise.resolve(handleDashboardRequest(req, res, root, opts)).catch((err) => {
      if (!res.headersSent) sendJson(res, 500, { error: err.message, next: 'amigo dashboard' });
    });
  });
}

function sendHtml(res, html, status = 200) {
  res.writeHead(status, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(html),
  });
  res.end(html);
}

function safeFile(root, pathname) {
  let rel = decodeURIComponent(pathname).replace(/^\/+/, '');
  if (!rel || rel.endsWith('/')) rel = join(rel, 'index.html');
  const resolved = resolve(root, rel);
  const relToRoot = relative(root, resolved);
  if (relToRoot.startsWith('..') || isAbsolute(relToRoot)) return null;
  return resolved;
}

function sendStatic(res, dist, pathname) {
  const file = safeFile(dist, pathname);
  if (!file || !existsSync(file) || !statSync(file).isFile()) return false;
  const body = readFileSync(file);
  const ext = extname(file).toLowerCase();
  res.writeHead(200, {
    'content-type': MIME[ext] || 'application/octet-stream',
    'cache-control': ext === '.html' ? 'no-store' : 'public, max-age=31536000, immutable',
    'content-length': body.length,
  });
  res.end(body);
  return true;
}

export async function handleDashboardRequest(req, res, root, opts = {}) {
  const pathname = new URL(req.url || '/', 'http://127.0.0.1').pathname;
  if (req.method === 'GET' && !pathname.startsWith('/api/')) {
    if (opts.html && pathname === '/') {
      sendHtml(res, opts.html);
      return;
    }
    const dist = opts.staticDir || dashboardDistDir();
    if (sendStatic(res, dist, pathname)) return;
    if (pathname === '/') {
      sendHtml(res, FALLBACK_HTML);
      return;
    }
    sendJson(res, 404, { error: 'not found', next: 'amigo dashboard' });
    return;
  }
  if (req.method === 'GET' && pathname === '/api/status') {
    const statusFn = opts.status || dashboardStatusPayload;
    const payload = await statusFn(root, opts.statusOpts || {});
    sendJson(res, 200, payload);
    return;
  }
  const act = pathname.match(/^\/api\/projects\/([^/]+)\/(run|stop)$/);
  if (req.method === 'POST' && act) {
    const name = decodeURIComponent(act[1]);
    if (!PROJECT_NAME.test(name) || name === DASHBOARD_NAME) {
      sendJson(res, 404, { error: 'unknown project', name, next: 'amigo status' });
      return;
    }
    const start = opts.start || startProject;
    const stop = opts.stop || stopProject;
    try {
      const result = act[2] === 'run' ? start(root, name) : stop(root, name);
      sendJson(res, 200, result);
    } catch (err) {
      const extra = err instanceof AmigoError ? err.extra : {};
      sendJson(res, httpStatusFor(err), {
        error: err.message,
        ...Object.fromEntries(Object.entries(extra).filter(([k]) => k !== 'exitCode' && k !== 'next')),
        next: extra.next || 'amigo status',
      });
    }
    return;
  }
  sendJson(res, 404, { error: 'not found', next: 'amigo dashboard' });
}

export async function serveDashboard(root) {
  const port = dashboardPort();
  const server = createDashboardServer(root);
  try {
    await listenLoopback(server, port);
  } catch (err) {
    if (err && err.code === 'EADDRINUSE') {
      throw new AmigoError('dashboard port in use', {
        port,
        next: 'amigo dashboard stop',
      });
    }
    throw err;
  }
}

export function stopDashboard(root) {
  const rec = readRunRecord(root, DASHBOARD_NAME);
  const pid = rec?.pid;
  const wasRunning = pid ? isAlive(pid) : false;
  if (wasRunning) killTree(pid);
  clearRunRecord(root, DASHBOARD_NAME);
  return { name: 'dashboard', running: false, stopped: wasRunning };
}

export async function ensureDashboard(root, opts = {}) {
  const port = opts.port ?? dashboardPort();
  const open = opts.open ?? process.env.AMIGO_DASHBOARD_OPEN !== '0';
  const url = dashboardUrl(port);
  if (projectIsRunning(root, DASHBOARD_NAME) && (await waitForDashboard(port, 20))) {
    if (open) openBrowser(url);
    return { running: true, already: true, port, url };
  }
  if (await probeTcp(DASHBOARD_HOST, port)) {
    throw new AmigoError('dashboard port in use', {
      port,
      next: 'amigo dashboard stop',
    });
  }
  const cli = join(dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'amigo.mjs');
  const command = `${quoteCmd(process.execPath)} ${quoteCmd(cli)} dashboard serve`;
  const pid = spawnDetached({
    command,
    cwd: root,
    env: {
      AMIGO_STUDIO_ROOT: root,
      AMIGO_DASHBOARD_PORT: String(port),
    },
    logPath: logPath(root, DASHBOARD_NAME),
  });
  writeRunRecord(root, DASHBOARD_NAME, {
    pid,
    startedAt: new Date().toISOString(),
    command,
    port,
  });
  if (!(await waitForDashboard(port, 50))) {
    throw new AmigoError('dashboard did not start', {
      port,
      next: `read state/logs/${DASHBOARD_NAME}.log`,
    });
  }
  if (open) openBrowser(url);
  return { running: true, already: false, pid, port, url };
}
