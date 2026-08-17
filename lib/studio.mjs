import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';
import { parse, stringify } from 'yaml';
import { AmigoError } from './format.mjs';

export function findStudioRoot(start = process.cwd()) {
  if (process.env.AMIGO_STUDIO_ROOT) return process.env.AMIGO_STUDIO_ROOT;
  let dir = start;
  while (true) {
    if (existsSync(join(dir, 'catalog.yaml')) && existsSync(join(dir, 'package.json'))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      throw new AmigoError('not in Amigo Studio', {
        hint: 'Open C:\\Users\\Admin\\Amigo Studio and run from that folder',
        next: 'cd "C:\\Users\\Admin\\Amigo Studio"',
      });
    }
    dir = parent;
  }
}

export function loadCatalog(root) {
  const raw = parse(readFileSync(join(root, 'catalog.yaml'), 'utf8')) ?? {};
  if (!raw.projects || typeof raw.projects !== 'object' || Array.isArray(raw.projects)) {
    raw.projects = {};
  }
  return raw;
}

export function saveCatalog(root, catalog) {
  const text = stringify(catalog, { lineWidth: 0 });
  writeFileSync(join(root, 'catalog.yaml'), text.endsWith('\n') ? text : `${text}\n`);
}

export function loadCurrent(root) {
  const path = join(root, 'state', 'current.yaml');
  if (!existsSync(path)) return { active: 'none' };
  const raw = parse(readFileSync(path, 'utf8')) ?? {};
  const active = raw.active == null || raw.active === '' ? 'none' : String(raw.active);
  return { active };
}

export function saveCurrent(root, active) {
  mkdirSync(join(root, 'state'), { recursive: true });
  writeFileSync(join(root, 'state', 'current.yaml'), stringify({ active }) + '\n');
}

export function resolveProjectPath(root, row) {
  if (!row?.path) return null;
  return isAbsolute(row.path) ? row.path : join(root, row.path);
}

export function projectNames(catalog) {
  return Object.keys(catalog.projects || {});
}

export function requireProject(catalog, name, next = 'amigo status') {
  if (!name || name === 'none') {
    throw new AmigoError('no active project', {
      next: 'amigo switch <name>',
    });
  }
  const names = projectNames(catalog);
  const row = catalog.projects[name];
  if (!row) {
    throw new AmigoError('unknown project', {
      name,
      known: names.length ? names : 0,
      next,
    });
  }
  return row;
}

export function resolveNamedOrActive(catalog, current, name) {
  if (name) return { name, row: requireProject(catalog, name, 'amigo status') };
  const active = current.active;
  return { name: active, row: requireProject(catalog, active, 'amigo switch <name>') };
}

export function runRecordPath(root, name) {
  return join(root, 'state', 'run', `${name}.json`);
}

export function logPath(root, name) {
  return join(root, 'state', 'logs', `${name}.log`);
}

export function readRunRecord(root, name) {
  const path = runRecordPath(root, name);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

export function writeRunRecord(root, name, record) {
  mkdirSync(join(root, 'state', 'run'), { recursive: true });
  writeFileSync(runRecordPath(root, name), JSON.stringify(record, null, 2) + '\n');
}

export function clearRunRecord(root, name) {
  const path = runRecordPath(root, name);
  if (existsSync(path)) unlinkSync(path);
}
