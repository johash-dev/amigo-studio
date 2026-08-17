# Feature: Studio dashboard (“Hola Amigo”)

Feature ID: `studio-dashboard`
Status: approved — Owner 2026-08-17; UI stack 2026-08-17
Visual design: in scope (current screen only)

## Objective

Give the Owner a localhost browser page that lists every catalog product, starts and stops each one, and shows CPU/memory for that product’s tracked process tree plus its Docker/Compose containers.

## Business context

Amigo Studio is a thin host: catalog + CLI + Cursor agent. Status, run, and stop already exist in the CLI. The dashboard is a view and a pair of buttons over that same control plane — not a second product, not a new source of truth.

## User story

As the Owner, when I am in this Cursor workspace and I say **Hola Amigo** (or run `/dashboard` / `amigo dashboard`), I get a browser page on this machine where I can see every registered product, start or stop one, open its local URL, and see what it is using.

## Decisions (Owner)

| Decision | Lock |
| --- | --- |
| Entry | Chat phrase **Hola Amigo**, slash command `/dashboard`, and CLI `amigo dashboard`. The CLI is the real feature; chat just runs it. |
| v1 actions | List catalog projects with running / health / ports; **Run** and **Stop**; resource usage; link to the product web URL. No add/remove. No switching the active drawer from the page. |
| Resources | Tracked process tree (same tree `amigo stop` kills) **plus** Docker/Compose stats for that project. |
| Bind | `127.0.0.1` only. No login. Anyone on this machine can Run/Stop. |
| Lifetime | Studio sidecar. Stays up until `amigo dashboard stop`. Product `amigo stop` does not kill it. Saying Hola again while it is up only opens the browser. |
| Look and feel | Current screen is designed. Visual system can evolve; no extra screens in this pass. |
| UI stack | Small Vite+React app in `dashboard/`. Not a catalog product. Same sidecar and `/api`. Production serves `dashboard/dist`. Dev: Vite on 127.0.0.1:3998 proxying `/api` to 3999. |
| Stack labels | Scan the product checkout for Compose files, lockfiles, language manifests, and a short well-known `package.json` list. Not a catalog field. Not a full dependency tree. |

## Assumptions (Owner can override)

- Dashboard listen port is **3999** (below the first product block at 4000). Not a catalog row.
- Sidecar pid lives under `state/run/` with a reserved name that cannot be a product (`_dashboard`).
- Phrase match: case-insensitive `hola amigo`, optional surrounding punctuation/whitespace.
- No new npm dependencies **on the CLI**. The dashboard UI is a nested Vite+React app under `dashboard/` (devDependencies stay there).
- Catalog remains the only project registry. Dashboard reads `catalog.yaml` and `state/run/`. Stack labels are a best-effort scan of the product checkout (Compose files, lockfiles, language manifests, well-known `package.json` names). They are not catalog fields and are not a full dependency inventory.
- Compose project is whatever `docker compose` uses in that product directory (usually the folder name).
- If Docker is missing or down, process-tree stats still show; Docker stats are `n/a`.
- “Open” uses catalog `ports.web` as `http://127.0.0.1:<web>/`. Port tiles show the same localhost URLs as read-only copyable fields (not links). API is `http://127.0.0.1:<api>/`; Postgres is `127.0.0.1:<postgres>` (not HTTP).
- Page polls about every 3 seconds. No websockets.
- Run/Stop on the page call the same logic as `amigo run` / `amigo stop` (including: stop does not tear down Compose Postgres).

## Functional requirements

1. `amigo dashboard` starts the sidecar on `127.0.0.1:3999` if it is not running, then opens the default browser to that URL.
2. `amigo dashboard` when already running is success: open the browser, do not spawn a second listener.
3. `amigo dashboard stop` stops the sidecar and clears its run record. Missing/already-stopped is success.
4. `GET /` serves the dashboard page.
5. `GET /api/status` returns JSON for every catalog project: name, active, running, health, ports, web URL, stack labels, process CPU% and RSS, Docker CPU% and memory (or `n/a`).
6. `POST /api/projects/:name/run` starts that product the same way as `amigo run <name>`.
7. `POST /api/projects/:name/stop` stops that product the same way as `amigo stop <name>`.
8. Unknown project name on run/stop returns 404. Dashboard bind is loopback; mutating methods are POST.
9. Cursor: saying Hola Amigo, or `/dashboard`, runs `npx amigo dashboard` from the studio root.

## Non-functional requirements

- Loopback only. Do not listen on `0.0.0.0`.
- Windows is the first platform (this desk). Process-tree and Docker stats must work here; Unix can follow the same interfaces.
- Resource numbers are best-effort snapshots, not billing-grade. Stale or missing Docker does not fail the page.
- Starting the dashboard does not start any product.

## Acceptance criteria

1. Given a studio with one registered product that is stopped, when I run `amigo dashboard`, then a browser opens to `http://127.0.0.1:3999/` and the page lists that product as not running, with its catalog ports.
2. Given the dashboard is open and the product is stopped, when I click Run, then the product becomes running (same pid/log/port behavior as `amigo run`) and the page shows running plus a working web link.
3. Given the product is running, when I click Stop, then the tracked Node/pnpm tree stops and Compose Postgres is still up, matching `amigo stop`.
4. Given a running product with Compose containers, when the status payload is read, then it includes process-tree CPU/RSS and Docker CPU/memory for that project.
5. Given Docker is not running, when the status payload is read, then the page still loads, process stats are present or zero if nothing is running, and Docker stats are `n/a` (not an error splash).
6. Given the sidecar is already running, when I run `amigo dashboard` again, then no second bind occurs and the browser opens to the same URL.
7. Given the sidecar is running, when I `amigo stop <product>`, then the dashboard sidecar is still running.
8. Given I am not on this machine, when I try to reach port 3999 from another host, then I cannot (loopback bind).
9. Given an empty catalog, when I open the dashboard, then I see an empty state, not a crash, and there are no Run buttons.

## User-visible behavior

- One page. One row/card per catalog product.
- Each product shows: name, whether it is the active drawer, running yes/no, health when a health URL exists, major stack labels when detected, ports with copyable localhost URLs, process CPU/memory, Docker CPU/memory, Run or Stop, Open (web).
- Empty catalog: explicit empty copy, next step is add a product in chat/CLI (not from this page).
- Run while already running: same as CLI (success, already running).
- Failed start: the card shows a failure the Owner can act on (not a silent no-op). Log pointer: `amigo logs <name>` is enough; log tail on the card is out of scope.
- One designed screen. Extra routes wait for a later feature.

## UI contract

Screens / routes:

- `/` — the only screen. Dashboard home.
- `/api/status`, `/api/projects/:name/run`, `/api/projects/:name/stop` — not screens.

Primary flows:

1. Owner → “Hola Amigo” or `/dashboard` or `amigo dashboard` → browser opens `/` → sees project list.
2. Owner → Run on a stopped product → same screen, that product becomes running; Open is available.
3. Owner → Stop on a running product → same screen, that product becomes stopped; Open may still be listed but the app is down.
4. Owner → Open → new browser tab to `http://127.0.0.1:<web>/`.
5. Owner → `amigo dashboard stop` (CLI) → sidecar dies; the open tab will fail subsequent polls.

Role matrix:

- Single role: Owner on this machine. No staff/product roles. Everything on the page is visible and actionable for that person. Network peers are not a role; they are excluded by bind address.

States (home screen):

| State | What the Owner sees |
| --- | --- |
| Empty catalog | Empty copy. No Run/Stop. |
| Loading / first fetch | Page is up; project data arrives from `/api/status`. |
| Ready | One card per project with current running/health/resources. |
| Product starting | Run was clicked; card does not pretend success until running is true (or a start error is shown). |
| Docker n/a | Docker figures show `n/a`. Rest of card works. |
| Status poll error | Page stays; last good data or an explicit “cannot reach sidecar” note. |
| Sidecar gone | Tab can no longer refresh; Owner uses `amigo dashboard` to bring it back. |

Copy constraints:

- Product names and ports come from the catalog, not invented labels.
- Empty state points at adding a product via Amigo/CLI, not a button on this page.
- Wordmark is **Amigo**. Warm dark desk, not a marketing landing page.

Reuse:

- Catalog, run records, health probe, `run`/`stop` process behavior already in the CLI.
- UI lives in `dashboard/` (Vite+React). Sidecar serves `dashboard/dist`.

Out of UI scope:

- Extra screens, log viewer, add/remove project, switch active drawer, LAN access, login, websockets, shadcn/design-system package.

## API behavior

All HTTP is loopback. JSON only on `/api/*`.

`GET /api/status`

- 200. Body includes sidecar identity (port) and `projects[]` with: `name`, `active`, `running`, `health` (`ok` / `down` / `http_*` / `n/a`), `ports`, `url` (web or null), `urls` (`web` / `api` as `http://127.0.0.1:<port>/`, `postgres` as `127.0.0.1:<port>`; omit missing keys), `stack` (string labels, possibly empty), `resources.process` (`cpuPercent`, `rssBytes` or null), `resources.docker` (`cpuPercent`, `memoryBytes` or null meaning n/a).

`POST /api/projects/:name/run`

- 200 if start began or already running.
- 404 unknown name.
- 409/500 if start cannot run (missing path, no start command) — same conditions as CLI errors.

`POST /api/projects/:name/stop`

- 200 if stopped or already stopped.
- 404 unknown name.

`GET /`

- 200 `text/html`.

No GET handlers that mutate. No CORS for other origins required (same-origin page).

## Data behavior

- Read: `catalog.yaml`, `state/current.yaml`, `state/run/<product>.json`, product health URL, OS process tree from the recorded pid, `docker compose` stats in the product directory.
- Write: product run records via existing run/stop; dashboard run record for the sidecar only.
- Does not write catalog, does not change `active`, does not write product source.

## Authorization

- Not an application login.
- Control plane is “process on this machine + loopback.”
- UI is not the authz boundary; bind address is.

## Error states

- Port 3999 in use by something else: CLI fails with a clear error and a next step; do not bind a random port.
- Docker CLI missing / daemon down: Docker stats `n/a`, page lives.
- Product path missing: Run returns an error the card can show; matches CLI “project path missing.”
- Health probe timeout: `down` or existing CLI probe behavior, not a page crash.

## Edge cases

- Two products running: both cards show independent stats and Run/Stop.
- Stop leaves Postgres up: Docker stats may still show DB usage after Stop. That is correct given current stop semantics and the Owner’s resource choice.
- Product with no `ports.web`: no Open link and no web URL on the tile.
- Product with no `ports.api`: no API tile. Port-tile URLs are never links.
- Missing checkout or no known manifests: `stack` is `[]`; the card omits the row. Never reads `node_modules`.
- Product with no `health`: health `n/a`.
- Reserved `_dashboard` is never listed as a product.
- `amigo dashboard stop` does not stop products.

## Dependencies

- Existing `amigo run` / `amigo stop` / health probe / catalog.
- Docker CLI only for the Docker half of stats.
- OS process listing for the tracked pid tree (Windows first).

## Constraints

- Thin studio CLI. The dashboard **view** is Vite+React under `dashboard/`. It is not a catalog product and does not get a product port block.
- High-risk: local HTTP control plane that starts processes. Bind stays loopback.
- Ponytail: extract shared run/stop rather than shelling out to a nested `amigo` if that keeps one implementation.

## Out of scope

- Look and feel beyond this screen (marketing site, design-system package, extra routes).
- Add/remove/register projects from the page.
- Switching `state/current.yaml` from the page.
- Log tail on the card.
- `amigo stop --db` / tearing down Compose on product Stop.
- LAN bind, auth, TLS.
- Auto-start when Cursor opens the folder (phrase/CLI/slash only).
- Attribution of Docker Desktop’s own VM memory as a product.
- Remote/cloud dashboard.

## Test requirements

Studio runner: `node --test test/check.mjs` (or a sibling test file the same way). No new framework.

Must cover:

- `amigo dashboard` / `amigo dashboard stop` parse and help text.
- Already-running dashboard does not double-bind (can use an ephemeral port in unit tests if 3999 is injected; production default remains 3999).
- Status JSON lists catalog projects and never lists `_dashboard`.
- Stack scan returns well-known labels from Compose/lockfile/workspace `package.json` and ignores `node_modules`.
- Run/Stop HTTP handlers call the same start/stop behavior as CLI for a fake project.
- Loopback bind (listen address is `127.0.0.1`).
- Docker-down path returns `n/a` rather than throwing.
- Process-tree stats helper is unit-tested with a fixture pid or a stub; do not require a live product stack for CI.

Do not require Docker Desktop or Assidua Ops to be up for `npm test`.

## Definition of Done

- This spec approved by the Owner.
- CLI, sidecar, page, Cursor skill/slash command, and `docs/cli.md` updated.
- Tests above are red-then-green and run on this machine.
- Evidence: commands and files named in the Owner reply. No weakened tests.
- Built `dashboard/dist` is what `amigo dashboard` serves. `npm run dashboard:dev` is for UI work only.
