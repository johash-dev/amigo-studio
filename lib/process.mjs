import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { delimiter, dirname, join } from 'node:path';

export function isAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === 'EPERM';
  }
}

export function killTree(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
    return;
  }
  try {
    process.kill(-pid, 'SIGTERM');
  } catch {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      // already gone
    }
  }
}

export function readDotEnv(dir) {
  const path = join(dir, '.env');
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    let value = trimmed.slice(eq + 1);
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[trimmed.slice(0, eq)] = value;
  }
  return out;
}

export function spawnDetached({ command, cwd, env, logPath, extraPath }) {
  mkdirSync(dirname(logPath), { recursive: true });
  appendFileSync(logPath, `\n===== amigo run ${new Date().toISOString()} =====\n`);
  const isWin = process.platform === 'win32';
  const quotedLog = `"${String(logPath).replace(/"/g, '')}"`;
  const wrapped = `(${command}) >> ${quotedLog} 2>&1`;
  const currentPath = env?.PATH || env?.Path || process.env.PATH || process.env.Path || '';
  const PATH = extraPath ? `${extraPath}${delimiter}${currentPath}` : currentPath;
  const child = spawn(
    isWin ? process.env.ComSpec || 'cmd.exe' : 'sh',
    isWin ? ['/d', '/s', '/c', wrapped] : ['-c', wrapped],
    {
      cwd,
      env: {
        ...process.env,
        COREPACK_ENABLE_DOWNLOAD_PROMPT: '0',
        ...env,
        PATH,
        Path: PATH,
        CI: 'true',
      },
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
      windowsVerbatimArguments: isWin,
    },
  );
  child.unref();
  return child.pid;
}

export function tailFile(path, lines = 40) {
  if (!existsSync(path)) return '';
  const text = readFileSync(path, 'utf8');
  const parts = text.split(/\r?\n/);
  return parts.slice(-lines).join('\n');
}

export async function probeHealth(url, timeoutMs = 1500) {
  if (!url) return null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    return res.ok ? 'ok' : `http_${res.status}`;
  } catch {
    return 'down';
  }
}
