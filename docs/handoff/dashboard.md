# Handoff: studio dashboard

Task: Continue Amigo Studio dashboard work (`studio-dashboard`). v1 is accepted by the Owner. Do not rebuild the control plane.

Current state: Studio (`state/current.yaml` active `none`). Dashboard is a localhost sidecar, not a catalog product.

Completed:
- CLI `amigo dashboard` / `amigo dashboard stop` on `127.0.0.1:3999`
- Same Run/Stop as `amigo run` / `amigo stop` (Postgres stays up on Stop)
- Status API + process-tree and Docker/Compose stats
- Vite+React view in `dashboard/`; sidecar serves `dashboard/dist`
- Owner liked the overall look; ports and status were restyled (pills + port board + inline SVGs)
- Owner: “All good for now.”

Files changed (studio repo, likely uncommitted):
- Spec: `docs/specs/dashboard.md`
- CLI: `bin/amigo.mjs`, `lib/dashboard.mjs`, `lib/lifecycle.mjs`, `lib/resources.mjs`, `lib/studio.mjs`, `lib/format.mjs`
- UI: `dashboard/` (build with `npm run dashboard:build`)
- Tests: `test/dashboard.mjs`, `package.json` test script
- Chat entry: `.cursor/skills/studio-dashboard/SKILL.md`, `.cursor/commands/dashboard.md`, `.cursor/skills/INDEX.md`
- Docs: `docs/cli.md`, `docs/OWNER.md`, `README.md`

Decisions (do not reopen unless Owner says so):
- Chat phrase **Hola Amigo**, `/dashboard`, and CLI — CLI is the real feature
- Loopback only, no login, port 3999
- Sidecar until `amigo dashboard stop`; product stop does not kill it
- React is the view only; `/api` stays on the Node sidecar
- Not a row in `catalog.yaml`
- No add/remove projects, no switching `active` from the page

Requirements: `docs/specs/dashboard.md` (feature ID `studio-dashboard`)

Validation: from studio root, `npm test`. UI: `npm run dashboard:build` then refresh `http://127.0.0.1:3999/` (or `npx amigo dashboard` if the sidecar is down). Live UI: sidecar up, then `npm run dashboard:dev` (3998, proxies `/api` to 3999).

Failures: none open.

Open questions: none. Owner chose stack labels by scanning the checkout (Compose, lockfiles, well-known package names). Next feature is whatever the Owner names (logs on the card, more screens, visual tweaks, git commit — none requested).

Known risks: local HTTP control plane can start/stop process trees. Bind must stay `127.0.0.1`. `dashboard/dist` is gitignored; a fresh clone needs `npm install --prefix dashboard` and `npm run dashboard:build`.

Next exact step: Wait for the Owner. If they want a UI change, edit `dashboard/src/`, build, refresh. If they want API/CLI, keep one implementation in `lib/lifecycle.mjs`.

Commands:
```text
npx amigo dashboard
npx amigo dashboard stop
npm test
npm run dashboard:build
npm run dashboard:dev
```
