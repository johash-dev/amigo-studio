import { encode } from '@toon-format/toon';

export class AmigoError extends Error {
  constructor(message, extra = {}) {
    super(message);
    this.name = 'AmigoError';
    this.extra = extra;
    this.exitCode = extra.exitCode ?? 1;
  }
}

export function encodeToon(data) {
  try {
    return encode(data);
  } catch {
    return fallbackToon(data);
  }
}

function fallbackToon(value, indent = 0) {
  const pad = '  '.repeat(indent);
  if (value === null || value === undefined) return 'null';
  if (typeof value !== 'object') return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return '0';
    const keys = value.every((row) => row && typeof row === 'object' && !Array.isArray(row))
      ? Object.keys(value[0])
      : null;
    if (keys) {
      const header = `[${value.length}]{${keys.join(',')}}:`;
      const rows = value.map((row) => `${pad}  ${keys.map((k) => row[k]).join(',')}`);
      return `${header}\n${rows.join('\n')}`;
    }
    return value.map((item) => `${pad}- ${fallbackToon(item, indent + 1)}`).join('\n');
  }
  const lines = Object.entries(value).map(([k, v]) => {
    if (Array.isArray(v) && v.length > 0 && v.every((row) => row && typeof row === 'object')) {
      return `${pad}${k}${fallbackToon(v, indent)}`;
    }
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      return `${pad}${k}:\n${fallbackToon(v, indent + 1)}`;
    }
    return `${pad}${k}: ${fallbackToon(v, indent)}`;
  });
  return lines.join('\n');
}

export function statusModel({ projects = {}, active, runningMap = {}, health }) {
  const names = Object.keys(projects);
  const rows = names.map((name) => {
    const row = projects[name] || {};
    const ports = row.ports || {};
    return {
      name,
      active: active === name,
      running: Boolean(runningMap[name]),
      web: ports.web ?? '',
      api: ports.api ?? '',
    };
  });
  const model = {
    studio: 'Amigo Studio',
    active: active && active !== 'none' ? active : 'none',
    running: rows.filter((row) => row.running).length,
  };
  model.projects = rows.length === 0 ? 0 : rows;
  if (health) model.health = health;
  return model;
}

export function nextHint({ command, projects = {}, active, runningMap = {}, name, extra } = {}) {
  const names = Object.keys(projects);
  if (command === 'add' && name) return `amigo switch ${name}`;
  if (command === 'switch' && name) {
    if (name === 'none') return 'amigo status';
    return runningMap[name] ? `amigo status` : `amigo run ${name}`;
  }
  if (command === 'run' && name) return `open http://localhost:${projects[name]?.ports?.web ?? 4000}/`;
  if (command === 'stop' && name) return `amigo run ${name}`;
  if (command === 'logs') return 'amigo status';
  if (names.length === 0) return 'amigo add <git-url>';
  if (!active || active === 'none') return `amigo switch ${names[0]}`;
  if (!runningMap[active]) return `amigo run ${active}`;
  if (extra) return extra;
  return `amigo logs ${active}`;
}

export function renderOutput(model, next) {
  return `${encodeToon(model)}\nnext: ${next}\n`;
}

export function renderError(err) {
  const extra = err instanceof AmigoError ? err.extra : {};
  const model = { error: err.message };
  for (const [key, value] of Object.entries(extra)) {
    if (key === 'exitCode' || key === 'next') continue;
    model[key] = value;
  }
  const next = extra.next || 'amigo help';
  return renderOutput(model, next);
}

export const HELP = {
  '': `amigo — Amigo Studio CLI

Usage:
  amigo                 live status (not help)
  amigo status
  amigo switch <name>
  amigo add <git-url> [name]
  amigo run [name]
  amigo stop [name]
  amigo logs [name] [--full]
  amigo dashboard
  amigo dashboard stop
  amigo help [subcommand]

Catalog is the source of truth for ports. Postgres stays up on stop.
`,
  status: `amigo status

Print active project, registered projects, ports, running yes/no, health.
Same as: amigo
`,
  switch: `amigo switch <name>

Write state/current.yaml. Unknown names fail. Already-active is success.
none or studio leaves the product drawer (studio files only).
`,
  add: `amigo add <git-url> [name]

Clone into projects/<name>, assign the next unused port block, append catalog.
Does not start the app. Default name is the repo name.
`,
  run: `amigo run [name]

Start named or active project. Records the process tree under state/run/<name>.
Exports WEB_PORT, API_PORT, POSTGRES_PORT, and DATABASE_URL (port rewritten).
`,
  stop: `amigo stop [name]

Stop that project's tracked Node/pnpm tree only. Compose Postgres stays up.
`,
  logs: `amigo logs [name] [--full]

Tail the project log. --full prints the whole file.
`,
  dashboard: `amigo dashboard
amigo dashboard stop

Start the localhost dashboard sidecar on 127.0.0.1:3999 and open the browser.
Already running is success: open the page again, do not bind twice.
stop ends the sidecar only. Product amigo stop does not.
`,
  help: `amigo help [subcommand]

Concise per-command help.
`,
};
