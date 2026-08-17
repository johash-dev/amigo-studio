import { readdirSync, readFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { spawnSync } from 'node:child_process';

const cpuSamples = new Map();
let processListCache = { at: 0, table: null };

export function resetCpuSamples() {
  cpuSamples.clear();
  processListCache = { at: 0, table: null };
}

export function collectTree(rootPid, table) {
  if (!Number.isInteger(rootPid) || rootPid <= 0 || !table) return null;
  const byParent = new Map();
  for (const p of table.values()) {
    const list = byParent.get(p.ppid);
    if (list) list.push(p.pid);
    else byParent.set(p.ppid, [p.pid]);
  }
  let rssBytes = 0;
  let cpu100ns = 0n;
  let pcpu = 0;
  let found = false;
  const seen = new Set();
  const stack = [rootPid];
  while (stack.length) {
    const id = stack.pop();
    if (seen.has(id)) continue;
    seen.add(id);
    const p = table.get(id);
    if (!p) continue;
    found = true;
    rssBytes += p.rss || 0;
    cpu100ns += p.cpu100ns || 0n;
    pcpu += p.pcpu || 0;
    for (const child of byParent.get(id) || []) stack.push(child);
  }
  if (!found) return null;
  return { rssBytes, cpu100ns, pcpu };
}

export function parsePidCsv(text) {
  const table = new Map();
  for (const line of String(text).split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || /[a-z]/i.test(trimmed) && trimmed.includes('ProcessId')) continue;
    const parts = trimmed.split(',');
    if (parts.length < 5) continue;
    const pid = Number(parts[0]);
    const ppid = Number(parts[1]);
    const rss = Number(parts[2]);
    if (!Number.isInteger(pid) || pid <= 0) continue;
    let cpu100ns = 0n;
    try {
      cpu100ns = BigInt(parts[3] || 0) + BigInt(parts[4] || 0);
    } catch {
      cpu100ns = 0n;
    }
    table.set(pid, { pid, ppid: Number.isInteger(ppid) ? ppid : 0, rss: Number.isFinite(rss) ? rss : 0, cpu100ns, pcpu: 0 });
  }
  return table.size ? table : null;
}

export function parseWmicCsv(text) {
  const lines = String(text)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return null;
  const header = lines[0].split(',').map((h) => h.trim());
  const idx = (name) => header.findIndex((h) => h.toLowerCase() === name.toLowerCase());
  const iPid = idx('ProcessId');
  const iPpid = idx('ParentProcessId');
  const iRss = idx('WorkingSetSize');
  const iKer = idx('KernelModeTime');
  const iUsr = idx('UserModeTime');
  if (iPid < 0 || iPpid < 0 || iRss < 0) return null;
  const table = new Map();
  for (const line of lines.slice(1)) {
    const parts = line.split(',');
    const pid = Number(parts[iPid]);
    const ppid = Number(parts[iPpid]);
    const rss = Number(parts[iRss]);
    if (!Number.isInteger(pid) || pid <= 0) continue;
    let cpu100ns = 0n;
    try {
      cpu100ns = BigInt(parts[iKer] || 0) + BigInt(parts[iUsr] || 0);
    } catch {
      cpu100ns = 0n;
    }
    table.set(pid, {
      pid,
      ppid: Number.isInteger(ppid) ? ppid : 0,
      rss: Number.isFinite(rss) ? rss : 0,
      cpu100ns,
      pcpu: 0,
    });
  }
  return table.size ? table : null;
}

export function parseByteSize(s) {
  const m = String(s)
    .trim()
    .match(/^([\d.]+)\s*([KMGTPE]i?B|B)?$/i);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  if (!Number.isFinite(n)) return 0;
  const u = (m[2] || 'B').toUpperCase();
  const map = {
    B: 1,
    KB: 1e3,
    MB: 1e6,
    GB: 1e9,
    TB: 1e12,
    KIB: 1024,
    MIB: 1024 ** 2,
    GIB: 1024 ** 3,
    TIB: 1024 ** 4,
  };
  return Math.round(n * (map[u] || 1));
}

export function parseComposeStats(stdout) {
  const text = String(stdout || '').trim();
  if (!text) return null;
  const chunks = [];
  if (text.startsWith('[')) {
    try {
      const arr = JSON.parse(text);
      if (Array.isArray(arr)) chunks.push(...arr);
    } catch {
      return null;
    }
  } else {
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        chunks.push(JSON.parse(trimmed));
      } catch {
        return null;
      }
    }
  }
  if (!chunks.length) return null;
  let cpuPercent = 0;
  let memoryBytes = 0;
  for (const row of chunks) {
    cpuPercent += parseFloat(String(row.CPUPerc ?? row.CPUPercentage ?? '0').replace('%', '')) || 0;
    const mem = row.MemUsage ?? row.MemoryUsage ?? '';
    memoryBytes += parseByteSize(String(mem).split('/')[0] || '');
  }
  return { cpuPercent, memoryBytes };
}

function listProcessesWindows() {
  const wmic = spawnSync(
    'wmic',
    ['process', 'get', 'ProcessId,ParentProcessId,WorkingSetSize,KernelModeTime,UserModeTime', '/FORMAT:CSV'],
    { encoding: 'utf8', timeout: 8000, windowsHide: true, maxBuffer: 20 * 1024 * 1024 },
  );
  if (wmic.status === 0 && wmic.stdout) {
    const table = parseWmicCsv(wmic.stdout);
    if (table) return table;
  }
  const ps = spawnSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      "Get-CimInstance Win32_Process | ForEach-Object { '{0},{1},{2},{3},{4}' -f $_.ProcessId, $_.ParentProcessId, $_.WorkingSetSize, $_.KernelModeTime, $_.UserModeTime }",
    ],
    { encoding: 'utf8', timeout: 15000, windowsHide: true, maxBuffer: 20 * 1024 * 1024 },
  );
  if (ps.status !== 0) return null;
  return parsePidCsv(ps.stdout);
}

function listProcessesUnix() {
  if (process.platform === 'linux') {
    try {
      return listProcessesProc();
    } catch {
      // fall through to ps
    }
  }
  const r = spawnSync('ps', ['-axo', 'pid=,ppid=,rss=,pcpu='], { encoding: 'utf8', timeout: 5000 });
  if (r.status !== 0) return null;
  const table = new Map();
  for (const line of r.stdout.split(/\n/)) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 4) continue;
    const pid = Number(parts[0]);
    const ppid = Number(parts[1]);
    const rssKb = Number(parts[2]);
    const pcpu = Number(parts[3]);
    if (!Number.isInteger(pid) || pid <= 0) continue;
    table.set(pid, {
      pid,
      ppid: Number.isInteger(ppid) ? ppid : 0,
      rss: Number.isFinite(rssKb) ? Math.round(rssKb * 1024) : 0,
      cpu100ns: 0n,
      pcpu: Number.isFinite(pcpu) ? pcpu : 0,
    });
  }
  return table.size ? table : null;
}

function listProcessesProc() {
  const table = new Map();
  const hz = 100n;
  for (const name of readdirSync('/proc')) {
    if (!/^\d+$/.test(name)) continue;
    const pid = Number(name);
    try {
      const stat = readFileSync(`/proc/${pid}/stat`, 'utf8');
      const commEnd = stat.lastIndexOf(')');
      const rest = stat.slice(commEnd + 2).split(' ');
      const ppid = Number(rest[1]);
      const utime = BigInt(rest[11] || 0);
      const stime = BigInt(rest[12] || 0);
      const status = readFileSync(`/proc/${pid}/status`, 'utf8');
      const rssLine = status.split(/\n/).find((l) => l.startsWith('VmRSS:'));
      const rssKb = rssLine ? parseInt(rssLine.replace(/[^\d]/g, ''), 10) : 0;
      table.set(pid, {
        pid,
        ppid: Number.isInteger(ppid) ? ppid : 0,
        rss: Number.isFinite(rssKb) ? rssKb * 1024 : 0,
        cpu100ns: ((utime + stime) * 10_000_000n) / hz,
        pcpu: 0,
      });
    } catch {
      // process vanished
    }
  }
  return table.size ? table : null;
}

export function listProcesses(force = false) {
  const now = Date.now();
  if (!force && processListCache.table && now - processListCache.at < 1500) return processListCache.table;
  let table = null;
  try {
    table = process.platform === 'win32' ? listProcessesWindows() : listProcessesUnix();
  } catch {
    table = null;
  }
  processListCache = { at: now, table };
  return table;
}

export function processTreeStats(rootPid, opts = {}) {
  try {
    if (!Number.isInteger(rootPid) || rootPid <= 0) return null;
    const table = opts.listProcesses ? opts.listProcesses() : listProcesses();
    const agg = collectTree(rootPid, table);
    if (!agg) return null;
    if (agg.pcpu && !(agg.cpu100ns > 0n)) {
      return { cpuPercent: agg.pcpu, rssBytes: agg.rssBytes };
    }
    const at = opts.now ?? Date.now();
    const ncpu = opts.cpus ?? (cpus()?.length || 1);
    const last = cpuSamples.get(rootPid);
    let cpuPercent = 0;
    if (last && at > last.at) {
      const dCpu = Number(agg.cpu100ns - last.cpu100ns) / 10_000_000;
      const dWall = (at - last.at) / 1000;
      cpuPercent = dWall > 0 ? (dCpu / dWall / ncpu) * 100 : 0;
      if (!Number.isFinite(cpuPercent) || cpuPercent < 0) cpuPercent = 0;
    }
    cpuSamples.set(rootPid, { cpu100ns: agg.cpu100ns, at });
    return { cpuPercent, rssBytes: agg.rssBytes };
  } catch {
    return null;
  }
}

export function dockerComposeStats(dir, opts = {}) {
  if (!dir) return null;
  const run = opts.run || defaultDockerStats;
  try {
    const result = run(dir);
    if (!result || result.status !== 0) return null;
    return parseComposeStats(result.stdout || '');
  } catch {
    return null;
  }
}

function defaultDockerStats(dir) {
  return spawnSync('docker', ['compose', 'stats', '--no-stream', '--format', 'json'], {
    cwd: dir,
    encoding: 'utf8',
    timeout: 4000,
    windowsHide: true,
    maxBuffer: 2 * 1024 * 1024,
  });
}
