import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const COMPOSE_FILES = ['compose.yaml', 'compose.yml', 'docker-compose.yaml', 'docker-compose.yml'];
const LOCKFILES = [
  ['pnpm-lock.yaml', 'pnpm'],
  ['bun.lock', 'bun'],
  ['bun.lockb', 'bun'],
  ['yarn.lock', 'yarn'],
  ['package-lock.json', 'npm'],
];
const LANG_FILES = [
  ['go.mod', 'Go'],
  ['pyproject.toml', 'Python'],
  ['requirements.txt', 'Python'],
  ['Cargo.toml', 'Rust'],
  ['Gemfile', 'Ruby'],
  ['composer.json', 'PHP'],
  ['pom.xml', 'Java'],
  ['build.gradle', 'Java'],
  ['build.gradle.kts', 'Java'],
];
const WORKSPACE_DIRS = ['apps', 'packages', 'services'];
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage']);

const PKG_LABELS = [
  { pkg: 'next', label: 'Next' },
  { pkg: '@nestjs/core', label: 'Nest' },
  { pkg: 'nuxt', label: 'Nuxt' },
  { pkg: 'vue', label: 'Vue', skipIf: ['nuxt'] },
  { pkg: 'svelte', label: 'Svelte' },
  { pkg: '@angular/core', label: 'Angular' },
  { pkg: 'react', label: 'React', skipIf: ['next'] },
  { pkg: 'express', label: 'Express', skipIf: ['@nestjs/core'] },
  { pkg: 'fastify', label: 'Fastify' },
  { pkg: 'hono', label: 'Hono' },
  { pkg: 'prisma', label: 'Prisma' },
  { pkg: '@prisma/client', label: 'Prisma' },
  { pkg: 'drizzle-orm', label: 'Drizzle' },
  { pkg: 'vite', label: 'Vite', skipIf: ['next'] },
];

export function detectStack(dir) {
  if (!dir || !existsSync(dir)) return [];
  const seen = new Set();
  const out = [];
  const add = (label) => {
    if (!label || seen.has(label)) return;
    seen.add(label);
    out.push(label);
  };

  let composeText = '';
  for (const name of COMPOSE_FILES) {
    const p = join(dir, name);
    if (!existsSync(p)) continue;
    add('Compose');
    try {
      composeText = readFileSync(p, 'utf8');
    } catch {
      composeText = '';
    }
    break;
  }
  if (/postgres/i.test(composeText)) add('Postgres');

  for (const [file, label] of LOCKFILES) {
    if (existsSync(join(dir, file))) {
      add(label);
      break;
    }
  }

  for (const [file, label] of LANG_FILES) {
    if (existsSync(join(dir, file))) add(label);
  }

  const pkgs = collectDepNames(dir);
  for (const row of PKG_LABELS) {
    if (!pkgs.has(row.pkg)) continue;
    if (row.skipIf?.some((p) => pkgs.has(p))) continue;
    add(row.label);
  }
  return out;
}

function collectDepNames(dir) {
  const names = new Set();
  absorbPackage(join(dir, 'package.json'), names);
  // ponytail: one extra directory level (apps/*, packages/*, services/*). Upgrade: workspace globs.
  for (const bucket of WORKSPACE_DIRS) {
    const base = join(dir, bucket);
    if (!existsSync(base)) continue;
    try {
      if (!statSync(base).isDirectory()) continue;
    } catch {
      continue;
    }
    let entries = [];
    try {
      entries = readdirSync(base);
    } catch {
      continue;
    }
    for (const ent of entries) {
      if (SKIP_DIRS.has(ent)) continue;
      absorbPackage(join(base, ent, 'package.json'), names);
    }
  }
  return names;
}

function absorbPackage(file, names) {
  if (!existsSync(file)) return;
  try {
    const pkg = JSON.parse(readFileSync(file, 'utf8'));
    for (const key of ['dependencies', 'devDependencies']) {
      for (const name of Object.keys(pkg[key] || {})) names.add(name);
    }
  } catch {
    // skip unreadable / invalid json
  }
}
