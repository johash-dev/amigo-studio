#!/usr/bin/env node
/**
 * Non-blocking stop hook. Warns only when the payload looks like a completion
 * claim, an active project is set, and no evidence words appear.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

function failOpen(extra = {}) {
  process.stdout.write(JSON.stringify({ continue: true, ...extra }) + '\n');
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

function collectText(value, parts) {
  if (typeof value === 'string') parts.push(value);
  else if (Array.isArray(value)) value.forEach((item) => collectText(item, parts));
  else if (value && typeof value === 'object') {
    for (const item of Object.values(value)) collectText(item, parts);
  }
}

function activeProject() {
  const path = join(root, 'state', 'current.yaml');
  if (!existsSync(path)) return 'none';
  const match = readFileSync(path, 'utf8').match(/^active:\s*(.+)$/m);
  const value = match ? match[1].trim().replace(/^['"]|['"]$/g, '') : 'none';
  return value || 'none';
}

try {
  const raw = await readStdin();
  let payload = {};
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    failOpen();
    process.exit(0);
  }

  const active = activeProject();
  if (!active || active === 'none') {
    failOpen();
    process.exit(0);
  }

  const parts = [];
  collectText(payload, parts);
  const text = parts.join('\n');
  if (!text.trim()) {
    failOpen();
    process.exit(0);
  }

  const claimedDone = /\b(done|complete(?:d)?|finished|shipped|all (?:set|good))\b/i.test(text);
  const evidence = /\b(evidence|test(?:s)? (?:pass(?:ed)?|fail(?:ed)?|ran|run)|vitest|playwright|verified|typecheck|lint|npx amigo|amigo status)\b/i.test(text);
  if (claimedDone && !evidence) {
    failOpen({
      followup_message: `Active project is ${active}. Completion was claimed without naming evidence (tests, command output, or files checked). Confirm before treating the work as done.`,
    });
  } else {
    failOpen();
  }
} catch {
  failOpen();
}
