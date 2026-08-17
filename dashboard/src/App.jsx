import { useCallback, useEffect, useRef, useState } from 'react';

function fmtBytes(n) {
  if (n == null) return 'n/a';
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KiB`;
  if (n < 1073741824) return `${(n / 1048576).toFixed(1)} MiB`;
  return `${(n / 1073741824).toFixed(1)} GiB`;
}

function fmtCpu(n) {
  if (n == null) return 'n/a';
  return `${Number(n).toFixed(1)}%`;
}

function memOf(res) {
  if (!res) return null;
  return res.rssBytes != null ? res.rssBytes : res.memoryBytes;
}

function portsList(ports) {
  if (!ports) return [];
  return ['web', 'api', 'postgres']
    .filter((k) => ports[k] != null && ports[k] !== '')
    .map((k) => ({ k, v: ports[k] }));
}

function portAddress(key, port) {
  if (port == null || port === '') return null;
  if (key === 'postgres') return `127.0.0.1:${port}`;
  return `http://127.0.0.1:${port}/`;
}

function portMeta(key) {
  if (key === 'web') return { label: 'Web', Icon: IconGlobe };
  if (key === 'api') return { label: 'API', Icon: IconCode };
  if (key === 'postgres') return { label: 'Postgres', Icon: IconCylinder };
  return { label: key, Icon: IconGlobe };
}

function healthInfo(health) {
  if (health === 'ok') return { label: 'Healthy', tone: 'sage' };
  if (health === 'down') return { label: 'Unreachable', tone: 'rose' };
  if (String(health).startsWith('http_')) return { label: `HTTP ${String(health).slice(5)}`, tone: 'rose' };
  return null;
}

function Icon({ children }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function IconGlobe() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
    </Icon>
  );
}

function IconCode() {
  return (
    <Icon>
      <path d="m8 7-5 5 5 5M16 7l5 5-5 5" />
    </Icon>
  );
}

function IconCylinder() {
  return (
    <Icon>
      <ellipse cx="12" cy="6.5" rx="7" ry="2.5" />
      <path d="M5 6.5v11c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-11" />
      <path d="M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5" />
    </Icon>
  );
}

function IconActivity() {
  return (
    <Icon>
      <path d="M4 12h4l2.5-6 3 12 2.5-6H20" />
    </Icon>
  );
}

function StatusPill({ tone, pulse, children }) {
  const tones = {
    sage: 'border-sage/35 bg-sage/10 text-sage',
    rose: 'border-rose/35 bg-rose/10 text-rose',
    mute: 'border-line bg-paper/60 text-muted',
  };
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs ${tones[tone]}`}>
      <span className="relative flex h-2 w-2">
        {pulse ? (
          <span className="amigo-pulse absolute inline-flex h-full w-full rounded-full bg-current" />
        ) : null}
        <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
      </span>
      {children}
    </span>
  );
}

function StatusCluster({ project }) {
  const health = project.running ? healthInfo(project.health) : null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2" aria-label="status">
      {project.running ? (
        <StatusPill tone="sage" pulse>
          Running
        </StatusPill>
      ) : (
        <StatusPill tone="mute">Stopped</StatusPill>
      )}
      {health ? (
        <StatusPill tone={health.tone}>
          <IconActivity />
          {health.label}
        </StatusPill>
      ) : null}
    </div>
  );
}

function StackRow({ stack }) {
  if (!stack?.length) return null;
  return (
    <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="stack">
      {stack.map((name) => (
        <li
          key={name}
          className="rounded-full border border-line bg-panel-2 px-2.5 py-0.5 text-[11px] tracking-wide text-muted"
        >
          {name}
        </li>
      ))}
    </ul>
  );
}

function PortBoard({ ports, urls }) {
  if (!ports.length) return null;
  const cols =
    ports.length === 1 ? 'grid-cols-1' : ports.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-3';
  return (
    <ul className={`mt-5 grid ${cols} overflow-hidden rounded-xl border border-line bg-paper/50`} aria-label="ports">
      {ports.map((p, i) => {
        const meta = portMeta(p.k);
        const IconCmp = meta.Icon;
        const text = urls?.[p.k] || portAddress(p.k, p.v);
        return (
          <li key={p.k} className={i === 0 ? '' : 'border-t border-line sm:border-t-0 sm:border-l'}>
            <div className="px-4 py-3">
              <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-muted">
                <IconCmp />
                {meta.label}
              </span>
              <span className="mt-1.5 block font-mono text-xl tabular-nums tracking-tight text-ink">
                <span className="sr-only">{meta.label} port </span>
                <span className="text-copper/80">:</span>
                {p.v}
              </span>
              {text ? (
                <input
                  readOnly
                  value={text}
                  aria-label={`${meta.label} address`}
                  spellCheck={false}
                  onFocus={(e) => e.target.select()}
                  className="mt-1.5 w-full min-w-0 cursor-text truncate rounded-md border border-line bg-paper px-2 py-1.5 font-mono text-xs text-ink/90"
                />
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Meter({ label, res }) {
  const cpu = res?.cpuPercent;
  const width = cpu == null ? 0 : Math.min(100, Math.max(0, Number(cpu)));
  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[11px] uppercase tracking-[0.14em] text-muted">
        <span>{label}</span>
        <span className="font-sans normal-case tracking-normal text-ink/80">
          {fmtCpu(cpu)} · {fmtBytes(memOf(res))}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-paper/80 ring-1 ring-line/80">
        <div
          className={`h-full rounded-full ${res ? 'bg-copper' : 'bg-line'}`}
          style={{ width: res ? `${width}%` : '0%' }}
        />
      </div>
    </div>
  );
}

function ProjectCard({ project, busy, error, onRun, onStop }) {
  const ports = portsList(project.ports);
  return (
    <article className="rounded-2xl border border-line bg-panel/90 p-5 shadow-[0_20px_50px_-28px_rgba(0,0,0,0.7)] backdrop-blur-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-serif text-2xl font-semibold tracking-tight text-ink">{project.name}</h2>
            {project.active ? (
              <span className="rounded-full border border-copper/40 bg-copper/10 px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] text-copper">
                active
              </span>
            ) : null}
          </div>
          <StatusCluster project={project} />
          <StackRow stack={project.stack} />
        </div>
        <div className="flex flex-wrap gap-2">
          {project.running ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => onStop(project.name)}
              className="rounded-full border border-rose/40 bg-transparent px-4 py-2 text-sm text-rose disabled:opacity-50"
            >
              Stop
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => onRun(project.name)}
              className="rounded-full bg-copper px-4 py-2 text-sm font-medium text-copper-ink disabled:opacity-50"
            >
              Run
            </button>
          )}
          {project.url ? (
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-line bg-panel-2 px-4 py-2 text-sm text-ink"
            >
              Open
            </a>
          ) : null}
        </div>
      </div>

      <PortBoard ports={ports} urls={project.urls} />

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Meter label="process" res={project.resources?.process} />
        <Meter label="docker" res={project.resources?.docker} />
      </div>

      <p className="mt-3 min-h-5 text-sm text-rose" role="status">
        {error || ''}
      </p>
    </article>
  );
}

export default function App() {
  const [data, setData] = useState(null);
  const [banner, setBanner] = useState({ tone: 'muted', text: 'Loading…' });
  const [errors, setErrors] = useState({});
  const [pending, setPending] = useState({});
  const dataRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/status', { cache: 'no-store' });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const next = await res.json();
      dataRef.current = next;
      setData(next);
      const n = next.projects?.length || 0;
      setBanner({
        tone: 'muted',
        text: n ? `127.0.0.1:${next.port} · ${n} ${n === 1 ? 'drawer' : 'drawers'}` : 'No products yet.',
      });
    } catch {
      setBanner({
        tone: 'error',
        text: dataRef.current
          ? 'Cannot reach sidecar. Last good data is still shown. Run amigo dashboard to bring it back.'
          : 'Cannot reach sidecar. Run amigo dashboard.',
      });
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 3000);
    return () => clearInterval(id);
  }, [refresh]);

  async function act(name, kind) {
    setErrors((e) => ({ ...e, [name]: '' }));
    setPending((p) => ({ ...p, [name]: true }));
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(name)}/${kind}`, { method: 'POST' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) setErrors((e) => ({ ...e, [name]: body.error || `HTTP ${res.status}` }));
    } catch (err) {
      setErrors((e) => ({ ...e, [name]: String(err.message || err) }));
    }
    setPending((p) => ({ ...p, [name]: false }));
    await refresh();
  }

  const projects = data?.projects || [];

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:py-14">
      <header className="mb-10">
        <p className="text-[11px] uppercase tracking-[0.28em] text-copper">Studio</p>
        <h1 className="mt-2 font-serif text-5xl italic leading-none text-ink sm:text-6xl">Amigo</h1>
        <p className={`mt-4 text-sm ${banner.tone === 'error' ? 'text-rose' : 'text-muted'}`}>{banner.text}</p>
      </header>

      {data && projects.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-line bg-panel/40 px-6 py-14 text-center">
          <p className="font-serif text-2xl text-ink">Nothing in the drawers yet.</p>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted">
            Add a product in chat with <code className="text-copper">amigo add &lt;git-url&gt;</code>. This page does
            not register projects.
          </p>
        </section>
      ) : null}

      <div className="grid gap-4">
        {projects.map((project) => (
          <ProjectCard
            key={project.name}
            project={project}
            busy={Boolean(pending[project.name])}
            error={errors[project.name]}
            onRun={(name) => act(name, 'run')}
            onStop={(name) => act(name, 'stop')}
          />
        ))}
      </div>
    </div>
  );
}
