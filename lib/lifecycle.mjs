import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { AmigoError } from './format.mjs';
import { applyCatalogEnv } from './ports.mjs';
import { isAlive, killTree, probeHealth, readDotEnv, spawnDetached } from './process.mjs';
import { dockerComposeStats, processTreeStats } from './resources.mjs';
import { detectStack } from './stack.mjs';
import {
  DASHBOARD_NAME,
  clearRunRecord,
  dashboardPort,
  loadCatalog,
  loadCurrent,
  logPath,
  projectNames,
  readRunRecord,
  requireProject,
  resolveProjectPath,
  writeRunRecord,
} from './studio.mjs';

export function projectIsRunning(root, name) {
  const rec = readRunRecord(root, name);
  if (!rec?.pid) return false;
  if (isAlive(rec.pid)) return true;
  clearRunRecord(root, name);
  return false;
}

export function runningMap(root, catalog) {
  const map = {};
  for (const name of projectNames(catalog)) {
    if (name === DASHBOARD_NAME) continue;
    map[name] = projectIsRunning(root, name);
  }
  return map;
}

export function catalogProjectNames(catalog) {
  return projectNames(catalog).filter((name) => name !== DASHBOARD_NAME);
}

export function catalogPortUrls(ports = {}) {
  const urls = {};
  if (ports.web != null && ports.web !== '') urls.web = `http://127.0.0.1:${ports.web}/`;
  if (ports.api != null && ports.api !== '') urls.api = `http://127.0.0.1:${ports.api}/`;
  if (ports.postgres != null && ports.postgres !== '') urls.postgres = `127.0.0.1:${ports.postgres}`;
  return urls;
}

export function startProject(root, name) {
  const catalog = loadCatalog(root);
  const row = requireProject(catalog, name);
  const dir = resolveProjectPath(root, row);
  if (!dir || !existsSync(dir)) {
    throw new AmigoError('project path missing', {
      name,
      path: dir || row.path,
      next: 'confirm the product checkout exists, then amigo run',
    });
  }
  if (projectIsRunning(root, name)) {
    const rec = readRunRecord(root, name);
    return {
      name,
      running: true,
      already: true,
      pid: rec?.pid,
      web: row.ports?.web,
      api: row.ports?.api,
    };
  }
  if (!row.start) {
    throw new AmigoError('no start command', { name, next: 'set start in catalog.yaml' });
  }
  const env = applyCatalogEnv(row.ports || {}, readDotEnv(dir));
  const pid = spawnDetached({
    command: row.start,
    cwd: dir,
    env,
    logPath: logPath(root, name),
    extraPath: join(root, 'bin', 'win-shims'),
  });
  writeRunRecord(root, name, {
    pid,
    startedAt: new Date().toISOString(),
    command: row.start,
  });
  return { name, running: true, already: false, pid, web: row.ports?.web, api: row.ports?.api };
}

export function stopProject(root, name) {
  requireProject(loadCatalog(root), name);
  const rec = readRunRecord(root, name);
  const pid = rec?.pid;
  const wasRunning = pid ? isAlive(pid) : false;
  if (wasRunning) killTree(pid);
  clearRunRecord(root, name);
  return { name, running: false, stopped: wasRunning };
}

export function httpStatusFor(err) {
  if (!(err instanceof AmigoError)) return 500;
  if (err.message === 'unknown project' || err.message === 'no active project') return 404;
  if (err.message === 'project path missing' || err.message === 'no start command') return 409;
  return 500;
}

export async function dashboardStatusPayload(root, opts = {}) {
  const processStats = opts.processStats || processTreeStats;
  const dockerStats = opts.dockerStats || dockerComposeStats;
  const stackOf = opts.stackOf || detectStack;
  const catalog = loadCatalog(root);
  const current = loadCurrent(root);
  const projects = [];
  for (const name of catalogProjectNames(catalog)) {
    const row = catalog.projects[name];
    const running = projectIsRunning(root, name);
    let health = 'n/a';
    if (row.health) health = running ? await probeHealth(row.health) : 'n/a';
    const rec = running ? readRunRecord(root, name) : null;
    const proc = rec?.pid ? processStats(rec.pid) : null;
    const dir = resolveProjectPath(root, row);
    const dock = dir ? dockerStats(dir) : null;
    const ports = row.ports || {};
    const urls = catalogPortUrls(ports);
    projects.push({
      name,
      active: current.active === name,
      running,
      health,
      ports,
      url: urls.web || null,
      urls,
      stack: dir ? stackOf(dir) : [],
      resources: {
        process: proc,
        docker: dock,
      },
    });
  }
  return { port: opts.port ?? dashboardPort(), projects };
}
