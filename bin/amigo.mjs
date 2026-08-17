#!/usr/bin/env node
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { allocatePorts } from '../lib/ports.mjs';
import {
  AmigoError,
  HELP,
  nextHint,
  renderError,
  renderOutput,
  statusModel,
} from '../lib/format.mjs';
import { ensureDashboard, serveDashboard, stopDashboard } from '../lib/dashboard.mjs';
import { runningMap, startProject, stopProject } from '../lib/lifecycle.mjs';
import {
  findStudioRoot,
  loadCatalog,
  loadCurrent,
  logPath,
  requireProject,
  resolveNamedOrActive,
  saveCatalog,
  saveCurrent,
} from '../lib/studio.mjs';
import { probeHealth, tailFile } from '../lib/process.mjs';

function parseArgs(argv) {
  const args = argv.slice(2);
  if (args.length === 0) return { cmd: 'status', positionals: [], flags: {} };
  const first = args[0];
  if (first === '-h' || first === '--help') return { cmd: 'help', positionals: [], flags: {} };
  if (first.startsWith('-')) {
    throw new AmigoError('unknown flag', { flag: first, next: 'amigo help' });
  }
  const cmd = first;
  const positionals = [];
  const flags = {};
  for (const arg of args.slice(1)) {
    if (arg === '-h' || arg === '--help') return { cmd: 'help', positionals: [cmd], flags: {} };
    if (arg.startsWith('-')) {
      if (cmd === 'logs' && arg === '--full') flags.full = true;
      else throw new AmigoError('unknown flag', { flag: arg, next: `amigo help ${cmd}` });
    } else {
      positionals.push(arg);
    }
  }
  return { cmd, positionals, flags };
}

function nameFromGitUrl(url) {
  const cleaned = String(url).replace(/\/+$/, '').replace(/\.git$/i, '');
  const part = cleaned.split(/[/\\:]/).pop();
  if (!part) throw new AmigoError('could not derive project name', { url, next: 'amigo add <git-url> <name>' });
  return part.toLowerCase();
}

async function cmdStatus(root) {
  const catalog = loadCatalog(root);
  const current = loadCurrent(root);
  const running = runningMap(root, catalog);
  let health;
  const active = current.active;
  const row = active && active !== 'none' ? catalog.projects[active] : null;
  if (row?.health) {
    health = running[active] ? await probeHealth(row.health) : 'n/a';
  }
  const model = statusModel({
    projects: catalog.projects,
    active,
    runningMap: running,
    health,
  });
  const next = nextHint({ projects: catalog.projects, active, runningMap: running });
  process.stdout.write(renderOutput(model, next));
}

function cmdSwitch(root, name) {
  if (!name) throw new AmigoError('missing project name', { next: 'amigo switch <name>' });
  const catalog = loadCatalog(root);
  const current = loadCurrent(root);
  let active = name;
  if (!catalog.projects[name]) {
    if (name === 'none' || name === 'studio') active = 'none';
    else requireProject(catalog, name, 'amigo status');
  }
  saveCurrent(root, active);
  const running = runningMap(root, catalog);
  process.stdout.write(
    renderOutput(
      { switched: active, already: current.active === active },
      nextHint({ command: 'switch', projects: catalog.projects, active, runningMap: running, name: active }),
    ),
  );
}

function cmdAdd(root, url, nameArg) {
  if (!url) throw new AmigoError('missing git url', { next: 'amigo add <git-url> [name]' });
  const catalog = loadCatalog(root);
  const name = (nameArg || nameFromGitUrl(url)).toLowerCase();
  if (catalog.projects[name]) {
    throw new AmigoError('project already registered', { name, next: `amigo switch ${name}` });
  }
  const dest = join(root, 'projects', name);
  if (existsSync(dest)) {
    throw new AmigoError('folder already exists', { path: dest, next: `amigo switch ${name}` });
  }
  const ports = allocatePorts(catalog.projects);
  const cloned = spawnSync('git', ['clone', url, dest], { encoding: 'utf8' });
  if (cloned.status !== 0) {
    if (existsSync(dest)) rmSync(dest, { recursive: true, force: true });
    throw new AmigoError('git clone failed', {
      url,
      detail: (cloned.stderr || cloned.stdout || '').trim().slice(0, 400),
      next: 'amigo add <git-url> [name]',
    });
  }
  const origin = spawnSync('git', ['-C', dest, 'remote', 'get-url', 'origin'], { encoding: 'utf8' });
  catalog.projects[name] = {
    path: `projects/${name}`,
    origin: (origin.stdout || url).trim(),
    ports,
    health: null,
    start: 'docker compose up -d && pnpm install && pnpm dev',
    stop: null,
  };
  saveCatalog(root, catalog);
  process.stdout.write(
    renderOutput(
      { added: name, web: ports.web, api: ports.api, postgres: ports.postgres },
      nextHint({ command: 'add', name }),
    ),
  );
}

function cmdRun(root, nameArg) {
  const catalog = loadCatalog(root);
  const current = loadCurrent(root);
  const { name } = resolveNamedOrActive(catalog, current, nameArg);
  const result = startProject(root, name);
  const model = result.already
    ? { name: result.name, running: true, already: true }
    : { name: result.name, running: true, pid: result.pid, web: result.web, api: result.api };
  process.stdout.write(renderOutput(model, nextHint({ command: 'run', projects: catalog.projects, name })));
}

function cmdStop(root, nameArg) {
  const catalog = loadCatalog(root);
  const current = loadCurrent(root);
  const { name } = resolveNamedOrActive(catalog, current, nameArg);
  const result = stopProject(root, name);
  process.stdout.write(renderOutput(result, nextHint({ command: 'stop', name })));
}

async function cmdDashboard(root, action) {
  if (!action) {
    const result = await ensureDashboard(root);
    process.stdout.write(
      renderOutput(
        { dashboard: true, running: true, already: result.already, port: result.port, url: result.url },
        `open ${result.url}`,
      ),
    );
    return;
  }
  if (action === 'stop') {
    process.stdout.write(renderOutput(stopDashboard(root), 'amigo dashboard'));
    return;
  }
  if (action === 'serve') {
    await serveDashboard(root);
    return;
  }
  throw new AmigoError('unknown dashboard action', { action, next: 'amigo help dashboard' });
}

function cmdLogs(root, nameArg, full) {
  const catalog = loadCatalog(root);
  const current = loadCurrent(root);
  const { name } = resolveNamedOrActive(catalog, current, nameArg);
  const path = logPath(root, name);
  if (!existsSync(path)) {
    process.stdout.write(renderOutput({ name, logs: 0 }, 'amigo run ' + name));
    return;
  }
  const all = readFileSync(path, 'utf8');
  const lineCount = all.split(/\r?\n/).length;
  const truncated = !full && lineCount > 40;
  const body = (full ? all : tailFile(path, 40)).trimEnd();
  process.stdout.write(
    `name: ${name}\ntruncated: ${truncated}\nlogs:\n${body}\nnext: ${truncated ? `amigo logs ${name} --full` : 'amigo status'}\n`,
  );
}

function cmdHelp(topic) {
  const key = topic && HELP[topic] ? topic : '';
  if (topic && !HELP[topic]) {
    throw new AmigoError('unknown command', { command: topic, next: 'amigo help' });
  }
  process.stdout.write(HELP[key].endsWith('\n') ? HELP[key] : HELP[key] + '\n');
}

async function main() {
  const { cmd, positionals, flags } = parseArgs(process.argv);
  if (cmd === 'help') {
    cmdHelp(positionals[0]);
    return;
  }
  const root = findStudioRoot();
  switch (cmd) {
    case 'status':
      await cmdStatus(root);
      return;
    case 'switch':
      cmdSwitch(root, positionals[0]);
      return;
    case 'add':
      cmdAdd(root, positionals[0], positionals[1]);
      return;
    case 'run':
      cmdRun(root, positionals[0]);
      return;
    case 'stop':
      cmdStop(root, positionals[0]);
      return;
    case 'logs':
      cmdLogs(root, positionals[0], flags.full);
      return;
    case 'dashboard':
      await cmdDashboard(root, positionals[0]);
      return;
    default:
      throw new AmigoError('unknown command', { command: cmd, next: 'amigo help' });
  }
}

main().catch((err) => {
  process.stderr.write(renderError(err instanceof Error ? err : new Error(String(err))));
  process.exit(err instanceof AmigoError ? err.exitCode : 1);
});
