import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync, existsSync } from 'node:fs';
import { createServer as createNetServer } from 'node:net';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createDashboardServer, dashboardDistDir, ensureDashboard, listenLoopback, stopDashboard, waitForDashboard } from '../lib/dashboard.mjs';
import { catalogPortUrls, dashboardStatusPayload, startProject, stopProject } from '../lib/lifecycle.mjs';
import {
  dockerComposeStats,
  parseComposeStats,
  processTreeStats,
  resetCpuSamples,
} from '../lib/resources.mjs';
import { detectStack } from '../lib/stack.mjs';
import { DASHBOARD_NAME, writeRunRecord } from '../lib/studio.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const bin = join(root, 'bin', 'amigo.mjs');

function fixture() {
  const tmp = mkdtempSync(join(tmpdir(), 'amigo-dash-'));
  mkdirSync(join(tmp, 'state'), { recursive: true });
  mkdirSync(join(tmp, 'projects', 'demo'), { recursive: true });
  const hold = join(tmp, 'projects', 'demo', 'hold.mjs');
  writeFileSync(hold, 'setInterval(() => {}, 3600000);\n');
  const start = `${JSON.stringify(process.execPath)} ${JSON.stringify(hold)}`;
  writeFileSync(
    join(tmp, 'catalog.yaml'),
    `projects:
  demo:
    path: projects/demo
    origin: https://example.invalid/demo.git
    ports:
      web: 4100
      api: 4101
      postgres: 5434
    health: null
    start: ${JSON.stringify(start)}
    stop: null
`,
  );
  writeFileSync(join(tmp, 'state', 'current.yaml'), 'active: none\n');
  return tmp;
}

function fixtureEmpty() {
  const tmp = mkdtempSync(join(tmpdir(), 'amigo-dash-empty-'));
  mkdirSync(join(tmp, 'state'), { recursive: true });
  writeFileSync(join(tmp, 'catalog.yaml'), 'projects: {}\n');
  writeFileSync(join(tmp, 'state', 'current.yaml'), 'active: none\n');
  return tmp;
}

function closeServer(server) {
  return new Promise((resolve) => server.close(resolve));
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const s = createNetServer();
    s.listen(0, '127.0.0.1', () => {
      const port = s.address().port;
      s.close((err) => (err ? reject(err) : resolve(port)));
    });
    s.on('error', reject);
  });
}

test('amigo dashboard help and parse', () => {
  const help = spawnSync(process.execPath, [bin, 'help', 'dashboard'], { encoding: 'utf8', cwd: root });
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /amigo dashboard stop/);
  assert.match(help.stdout, /127\.0\.0\.1:3999/);
  const usage = spawnSync(process.execPath, [bin, 'help'], { encoding: 'utf8', cwd: root });
  assert.equal(usage.status, 0, usage.stderr);
  assert.match(usage.stdout, /amigo dashboard/);
  const tmp = fixtureEmpty();
  const bad = spawnSync(process.execPath, [bin, 'dashboard', 'nope'], {
    encoding: 'utf8',
    cwd: tmp,
    env: { ...process.env, AMIGO_STUDIO_ROOT: tmp },
  });
  assert.notEqual(bad.status, 0);
  assert.match(bad.stderr + bad.stdout, /unknown dashboard action/);
  const stop = spawnSync(process.execPath, [bin, 'dashboard', 'stop'], {
    encoding: 'utf8',
    cwd: tmp,
    env: { ...process.env, AMIGO_STUDIO_ROOT: tmp },
  });
  assert.equal(stop.status, 0, stop.stderr);
  assert.match(stop.stdout, /running: false/);
});

test('loopback bind and empty catalog have no run buttons in status', async (t) => {
  const tmp = fixtureEmpty();
  const server = createDashboardServer(tmp, {
    statusOpts: { processStats: () => null, dockerStats: () => null },
  });
  const addr = await listenLoopback(server, 0);
  t.after(() => closeServer(server));
  assert.equal(addr.address, '127.0.0.1');
  const base = `http://127.0.0.1:${addr.port}`;
  const page = await fetch(base + '/');
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /id="root"|not built/);
  const status = await fetch(base + '/api/status');
  assert.equal(status.status, 200);
  const payload = await status.json();
  assert.deepEqual(payload.projects, []);
});

test('built UI shell is served from dashboard/dist', async (t) => {
  const index = join(dashboardDistDir(), 'index.html');
  if (!existsSync(index)) {
    t.skip('run npm run dashboard:build');
    return;
  }
  const tmp = fixtureEmpty();
  const server = createDashboardServer(tmp);
  const addr = await listenLoopback(server, 0);
  t.after(() => closeServer(server));
  const html = await (await fetch(`http://127.0.0.1:${addr.port}/`)).text();
  assert.match(html, /id="root"/);
  const escape = await fetch(`http://127.0.0.1:${addr.port}/%2e%2e/package.json`);
  assert.equal(escape.status, 404);
});

test('waitForDashboard succeeds while /api/status is slow', async (t) => {
  const tmp = fixtureEmpty();
  const server = createDashboardServer(tmp, {
    status: async () => {
      await new Promise((r) => setTimeout(r, 2000));
      return { port: 0, projects: [] };
    },
  });
  const addr = await listenLoopback(server, 0);
  t.after(() => closeServer(server));
  assert.equal(await waitForDashboard(addr.port, 20), true);
});

test('catalogPortUrls is http for web/api and host:port for postgres', () => {
  assert.deepEqual(catalogPortUrls({ web: 4000, api: 4001, postgres: 5433 }), {
    web: 'http://127.0.0.1:4000/',
    api: 'http://127.0.0.1:4001/',
    postgres: '127.0.0.1:5433',
  });
  assert.deepEqual(catalogPortUrls({ postgres: 5433 }), { postgres: '127.0.0.1:5433' });
  assert.deepEqual(catalogPortUrls({}), {});
});

test('detectStack reads compose, lockfile, and well-known workspace packages', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'amigo-stack-'));
  mkdirSync(join(tmp, 'apps', 'web'), { recursive: true });
  mkdirSync(join(tmp, 'apps', 'api'), { recursive: true });
  mkdirSync(join(tmp, 'node_modules', 'react'), { recursive: true });
  writeFileSync(join(tmp, 'pnpm-lock.yaml'), 'lockfileVersion: 9.0\n');
  writeFileSync(join(tmp, 'docker-compose.yml'), 'services:\n  postgres:\n    image: postgres:16\n');
  writeFileSync(
    join(tmp, 'apps', 'web', 'package.json'),
    JSON.stringify({ dependencies: { next: '15.0.0', react: '19.0.0' } }),
  );
  writeFileSync(
    join(tmp, 'apps', 'api', 'package.json'),
    JSON.stringify({ dependencies: { '@nestjs/core': '11.0.0', express: '4.0.0', '@prisma/client': '6.0.0' } }),
  );
  writeFileSync(
    join(tmp, 'node_modules', 'react', 'package.json'),
    JSON.stringify({ dependencies: { vue: '3.0.0' } }),
  );
  assert.deepEqual(detectStack(tmp), ['Compose', 'Postgres', 'pnpm', 'Next', 'Nest', 'Prisma']);
  assert.deepEqual(detectStack(join(tmp, 'missing')), []);
});

test('status JSON lists catalog projects and never lists _dashboard', async () => {
  const tmp = fixture();
  writeRunRecord(tmp, DASHBOARD_NAME, { pid: 1 });
  const payload = await dashboardStatusPayload(tmp, {
    port: 3999,
    processStats: () => null,
    dockerStats: () => null,
  });
  assert.deepEqual(
    payload.projects.map((p) => p.name),
    ['demo'],
  );
  assert.equal(payload.projects[0].running, false);
  assert.equal(payload.projects[0].url, 'http://127.0.0.1:4100/');
  assert.deepEqual(payload.projects[0].urls, {
    web: 'http://127.0.0.1:4100/',
    api: 'http://127.0.0.1:4101/',
    postgres: '127.0.0.1:5434',
  });
  assert.deepEqual(payload.projects[0].stack, []);
  assert.equal(payload.projects[0].resources.docker, null);
});

test('run and stop HTTP use the same lifecycle as CLI', async (t) => {
  const tmp = fixture();
  const server = createDashboardServer(tmp, {
    statusOpts: {
      processStats: () => ({ cpuPercent: 1.2, rssBytes: 2048 }),
      dockerStats: () => null,
    },
  });
  const addr = await listenLoopback(server, 0);
  t.after(async () => {
    try {
      stopProject(tmp, 'demo');
    } catch {
      // already stopped
    }
    await closeServer(server);
  });
  const base = `http://127.0.0.1:${addr.port}`;
  const getRun = await fetch(base + '/api/projects/demo/run');
  assert.equal(getRun.status, 404);
  const unknown = await fetch(base + '/api/projects/nope/run', { method: 'POST' });
  assert.equal(unknown.status, 404);
  const started = await fetch(base + '/api/projects/demo/run', { method: 'POST' });
  assert.equal(started.status, 200, await started.clone().text());
  const body = await started.json();
  assert.equal(body.running, true);
  const payload = await (await fetch(base + '/api/status')).json();
  assert.equal(payload.projects[0].running, true);
  assert.equal(payload.projects[0].resources.process.rssBytes, 2048);
  assert.equal(payload.projects[0].resources.docker, null);
  const stopped = await fetch(base + '/api/projects/demo/stop', { method: 'POST' });
  assert.equal(stopped.status, 200);
  assert.equal((await stopped.json()).running, false);
});

test('missing project path is 409', async (t) => {
  const tmp = fixtureEmpty();
  writeFileSync(
    join(tmp, 'catalog.yaml'),
    `projects:
  ghost:
    path: projects/ghost
    origin: https://example.invalid/ghost.git
    ports:
      web: 4200
    health: null
    start: echo hi
    stop: null
`,
  );
  const server = createDashboardServer(tmp);
  const addr = await listenLoopback(server, 0);
  t.after(() => closeServer(server));
  const res = await fetch(`http://127.0.0.1:${addr.port}/api/projects/ghost/run`, { method: 'POST' });
  assert.equal(res.status, 409);
});

test('already-running dashboard does not double-bind', async (t) => {
  const tmp = fixtureEmpty();
  const server = createDashboardServer(tmp, {
    statusOpts: { processStats: () => null, dockerStats: () => null },
  });
  const addr = await listenLoopback(server, 0);
  t.after(() => closeServer(server));
  writeRunRecord(tmp, DASHBOARD_NAME, { pid: process.pid, port: addr.port });
  const first = await ensureDashboard(tmp, { port: addr.port, open: false });
  assert.equal(first.already, true);
  const second = await ensureDashboard(tmp, { port: addr.port, open: false });
  assert.equal(second.already, true);
});

test('dashboard port in use by something else fails', async (t) => {
  const tmp = fixtureEmpty();
  const dummy = createNetServer();
  await new Promise((resolve, reject) => {
    dummy.listen(0, '127.0.0.1', resolve);
    dummy.on('error', reject);
  });
  t.after(() => new Promise((r) => dummy.close(r)));
  const port = dummy.address().port;
  await assert.rejects(() => ensureDashboard(tmp, { port, open: false }), /port in use/);
});

test('docker-down path returns n/a rather than throwing', () => {
  assert.equal(dockerComposeStats('/nope', { run: () => ({ status: 1, stdout: '' }) }), null);
  assert.equal(dockerComposeStats('/nope', { run: () => { throw new Error('missing'); } }), null);
  const parsed = parseComposeStats('{"CPUPerc":"1.50%","MemUsage":"10MiB / 1GiB"}\n');
  assert.equal(parsed.cpuPercent, 1.5);
  assert.equal(parsed.memoryBytes, 10 * 1024 * 1024);
});

test('process-tree stats helper with a stub table', () => {
  resetCpuSamples();
  const table1 = new Map([[10, { pid: 10, ppid: 1, rss: 4096, cpu100ns: 0n, pcpu: 0 }]]);
  const a = processTreeStats(10, { listProcesses: () => table1, now: 1000, cpus: 1 });
  assert.deepEqual(a, { cpuPercent: 0, rssBytes: 4096 });
  const table2 = new Map([
    [10, { pid: 10, ppid: 1, rss: 4096, cpu100ns: 10_000_000n, pcpu: 0 }],
    [11, { pid: 11, ppid: 10, rss: 1024, cpu100ns: 0n, pcpu: 0 }],
  ]);
  const b = processTreeStats(10, { listProcesses: () => table2, now: 2000, cpus: 1 });
  assert.equal(b.rssBytes, 5120);
  assert.equal(b.cpuPercent, 100);
  assert.equal(processTreeStats(999, { listProcesses: () => table2 }), null);
});

test('amigo dashboard CLI starts the sidecar then stop kills it', async (t) => {
  const tmp = fixtureEmpty();
  const port = await getFreePort();
  const env = {
    ...process.env,
    AMIGO_STUDIO_ROOT: tmp,
    AMIGO_DASHBOARD_PORT: String(port),
    AMIGO_DASHBOARD_OPEN: '0',
  };
  t.after(() => {
    spawnSync(process.execPath, [bin, 'dashboard', 'stop'], { encoding: 'utf8', cwd: tmp, env });
  });
  const start = spawnSync(process.execPath, [bin, 'dashboard'], {
    encoding: 'utf8',
    cwd: tmp,
    env,
    timeout: 20000,
  });
  assert.equal(start.status, 0, start.stderr + start.stdout);
  assert.match(start.stdout, /running: true/);
  assert.match(start.stdout, new RegExp(`127\\.0\\.0\\.1:${port}`));
  const status = await fetch(`http://127.0.0.1:${port}/api/status`);
  assert.equal(status.status, 200);
  assert.deepEqual((await status.json()).projects, []);
  const again = spawnSync(process.execPath, [bin, 'dashboard'], {
    encoding: 'utf8',
    cwd: tmp,
    env,
    timeout: 20000,
  });
  assert.equal(again.status, 0, again.stderr + again.stdout);
  assert.match(again.stdout, /already: true/);
  const stop = spawnSync(process.execPath, [bin, 'dashboard', 'stop'], {
    encoding: 'utf8',
    cwd: tmp,
    env,
  });
  assert.equal(stop.status, 0, stop.stderr);
  assert.match(stop.stdout, /stopped: true/);
});

test('startProject then stopProject for a fixture hold process', () => {
  const tmp = fixture();
  const started = startProject(tmp, 'demo');
  assert.equal(started.running, true);
  const again = startProject(tmp, 'demo');
  assert.equal(again.already, true);
  const stopped = stopProject(tmp, 'demo');
  assert.equal(stopped.running, false);
  assert.equal(stopped.stopped, true);
  const idle = stopDashboard(tmp);
  assert.equal(idle.running, false);
});
