import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { allocatePorts, applyCatalogEnv } from '../lib/ports.mjs';
import { nextHint, renderOutput, statusModel } from '../lib/format.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const bin = join(root, 'bin', 'amigo.mjs');

function amigo(args) {
  return spawnSync(process.execPath, [bin, ...args], { encoding: 'utf8', cwd: root, env: process.env });
}

const assidua = {
  path: 'projects/assidua-ops',
  origin: 'https://example.invalid/assidua-ops.git',
  ports: { web: 4000, api: 4001, postgres: 5433 },
  health: 'http://localhost:4001/api/health',
  start: 'pnpm dev',
  stop: null,
};

test('empty catalog status is explicit zero plus next step', () => {
  const model = statusModel({ projects: {}, active: 'none', runningMap: {} });
  const text = renderOutput(model, nextHint({ projects: {}, active: 'none', runningMap: {} }));
  assert.equal(model.projects, 0);
  assert.match(text, /projects: 0/);
  assert.match(text, /next: amigo add <git-url>/);
  assert.doesNotMatch(text, /Usage:/);
});

test('one project status lists compact fields', () => {
  const projects = { 'assidua-ops': assidua };
  const model = statusModel({
    projects,
    active: 'assidua-ops',
    runningMap: { 'assidua-ops': false },
  });
  const text = renderOutput(
    model,
    nextHint({ projects, active: 'assidua-ops', runningMap: { 'assidua-ops': false } }),
  );
  assert.match(text, /assidua-ops/);
  assert.match(text, /4000/);
  assert.match(text, /4001/);
  assert.match(text, /active/);
  assert.match(text, /running/);
  assert.match(text, /next: amigo run assidua-ops/);
});

test('second project gets 4100/4101/5434', () => {
  const next = allocatePorts({ 'assidua-ops': assidua });
  assert.deepEqual(next, { web: 4100, api: 4101, postgres: 5434 });
});

test('catalog env overlays ports and rewrites DATABASE_URL host port', () => {
  const env = applyCatalogEnv(
    { web: 4100, api: 4101, postgres: 5434 },
    { DATABASE_URL: 'postgresql://assidua:assidua@localhost:5433/assidua_ops' },
  );
  assert.equal(env.WEB_PORT, '4100');
  assert.equal(env.API_PORT, '4101');
  assert.equal(env.POSTGRES_PORT, '5434');
  assert.match(env.DATABASE_URL, /localhost:5434/);
});

test('amigo with empty catalog prints zero projects, not help', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'amigo-empty-'));
  mkdirSync(join(tmp, 'state'), { recursive: true });
  writeFileSync(join(tmp, 'catalog.yaml'), 'projects: {}\n');
  writeFileSync(join(tmp, 'state', 'current.yaml'), 'active: none\n');
  const result = spawnSync(process.execPath, [bin], {
    encoding: 'utf8',
    cwd: tmp,
    env: { ...process.env, AMIGO_STUDIO_ROOT: tmp },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /projects: 0/);
  assert.match(result.stdout, /next: amigo add <git-url>/);
  assert.doesNotMatch(result.stdout, /Usage:/);
});

test('amigo switch refuses unknown names', () => {
  const result = amigo(['switch', 'not-a-project']);
  assert.notEqual(result.status, 0);
  const text = result.stderr + result.stdout;
  assert.match(text, /unknown project/);
  assert.match(text, /not-a-project/);
});

test('amigo switch none and studio leave the product drawer', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'amigo-desk-'));
  mkdirSync(join(tmp, 'state'), { recursive: true });
  writeFileSync(
    join(tmp, 'catalog.yaml'),
    `projects:
  assidua-ops:
    path: projects/assidua-ops
    origin: https://example.invalid/assidua-ops.git
    ports:
      web: 4000
      api: 4001
      postgres: 5433
    health: null
    start: pnpm dev
    stop: null
`,
  );
  writeFileSync(join(tmp, 'state', 'current.yaml'), 'active: assidua-ops\n');
  const env = { ...process.env, AMIGO_STUDIO_ROOT: tmp };

  const studio = spawnSync(process.execPath, [bin, 'switch', 'studio'], {
    encoding: 'utf8',
    cwd: tmp,
    env,
  });
  assert.equal(studio.status, 0, studio.stderr);
  assert.match(studio.stdout, /switched: none/);
  assert.match(studio.stdout, /next: amigo status/);
  assert.match(readFileSync(join(tmp, 'state', 'current.yaml'), 'utf8'), /active: none/);

  writeFileSync(join(tmp, 'state', 'current.yaml'), 'active: assidua-ops\n');
  const none = spawnSync(process.execPath, [bin, 'switch', 'none'], {
    encoding: 'utf8',
    cwd: tmp,
    env,
  });
  assert.equal(none.status, 0, none.stderr);
  assert.match(none.stdout, /switched: none/);
  assert.match(readFileSync(join(tmp, 'state', 'current.yaml'), 'utf8'), /active: none/);

  const again = spawnSync(process.execPath, [bin, 'switch', 'studio'], {
    encoding: 'utf8',
    cwd: tmp,
    env,
  });
  assert.equal(again.status, 0, again.stderr);
  assert.match(again.stdout, /already: true/);
});

test('amigo status with one fixture project shows name, ports, active', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'amigo-'));
  mkdirSync(join(tmp, 'state'), { recursive: true });
  writeFileSync(
    join(tmp, 'catalog.yaml'),
    `projects:
  assidua-ops:
    path: projects/assidua-ops
    origin: https://example.invalid/assidua-ops.git
    ports:
      web: 4000
      api: 4001
      postgres: 5433
    health: http://localhost:4001/api/health
    start: pnpm dev
    stop: null
`,
  );
  writeFileSync(join(tmp, 'state', 'current.yaml'), 'active: assidua-ops\n');
  const result = spawnSync(process.execPath, [bin], {
    encoding: 'utf8',
    cwd: tmp,
    env: { ...process.env, AMIGO_STUDIO_ROOT: tmp },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /assidua-ops/);
  assert.match(result.stdout, /4000/);
  assert.match(result.stdout, /4001/);
  assert.match(result.stdout, /active/);
});

test('owner reply contract translates CLI instead of pasting TOON', () => {
  const rule = readFileSync(join(root, '.cursor/rules/00-amigo.mdc'), 'utf8');
  assert.match(rule, /\*\*Where:\*\*/);
  assert.match(rule, /\*\*Mode:\*\*/);
  assert.match(rule, /\*\*Allowed:\*\*/);
  assert.match(rule, /say \*\*Studio\*\*/i);
  assert.match(rule, /Do not paste TOON/);
  const status = readFileSync(join(root, '.cursor/skills/status/SKILL.md'), 'utf8');
  assert.match(status, /Translate that output into Owner chrome/);
  assert.doesNotMatch(status, /Report the CLI output/);
});

test('README is for any user, not this machine', () => {
  const readme = readFileSync(join(root, 'README.md'), 'utf8');
  assert.match(readme, /Talk to \*\*Amigo\*\*/);
  assert.match(readme, /docs\/cli\.md/);
  assert.doesNotMatch(readme, /C:\\Users\\Admin/);
  assert.doesNotMatch(readme, /projects: 0/);
  assert.doesNotMatch(readme, /not a rename of Assidua/);
  assert.doesNotMatch(readme, /switch to studio/i);
  assert.doesNotMatch(readme, /change Amigo/i);
  assert.doesNotMatch(readme, /two products can be up/i);
});

test('content-writing is in the studio workflow', () => {
  const index = readFileSync(join(root, '.cursor/skills/INDEX.md'), 'utf8');
  assert.match(index, /content-writing/);
  const writer = readFileSync(join(root, '.cursor/agents/writer.md'), 'utf8');
  assert.match(writer, /Not Owner-facing/);
  assert.match(writer, /content-writing/);
  const skill = readFileSync(join(root, '.cursor/skills/content-writing/SKILL.md'), 'utf8');
  assert.match(skill, /Name the \*\*reader\*\*/);
  const amigo = readFileSync(join(root, '.cursor/agents/amigo.md'), 'utf8');
  assert.match(amigo, /writer/);
});
