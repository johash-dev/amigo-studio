# Amigo Studio

A Cursor workspace that is a **desk** for multiple product repos. You talk to one companion: **Amigo**. Each product is a **drawer** — its own git repo, its own ports, never mixed into this studio’s commits.

Amigo Studio is not a product. It is not a rename of Assidua Ops. Assidua Ops stays `apps/web` + `apps/api` inside its own repository.

## Mental model

- Open **this folder** in Cursor: `C:\Users\Admin\Amigo Studio`
- Talk to **Amigo**
- Work in one drawer at a time unless you name another
- Vague “fix the test” means the **active** project in `state/current.yaml`
- Two `amigo run`s means two process trees. `amigo stop azend-lms` leaves Assidua Ops up
- Commits never mix products

**Ship** means implement. **Scout** means investigate only — no edits.

## First day

1. File → Open Folder → `C:\Users\Admin\Amigo Studio`
2. In a terminal at the studio root:

```powershell
npm install
npx amigo
```

You should see `projects: 0` and a next step. That is success: the catalog is empty until a product is registered.

3. Talk to Amigo in chat. Slash commands `/status` `/switch` `/run` `/stop` `/add` call the same CLI.

Optional convenience (studio only, not a global publish):

```powershell
npm link
amigo
```

Or always: `npx amigo` / `npm run amigo`.

On Windows, `amigo run` puts `bin/win-shims` on PATH so nested `pnpm` scripts work without a global pnpm (the shim calls `corepack pnpm`). Compose Postgres stays up after `amigo stop`.

## CLI

| Command | What it does |
| --- | --- |
| `amigo` / `amigo status` | Live status (not a help page) |
| `amigo switch <name>` | Set the active drawer |
| `amigo add <git-url> [name]` | Clone into `projects/<name>`, assign ports, do not start |
| `amigo run [name]` | Start named or active project |
| `amigo stop [name]` | Stop that project’s Node/pnpm tree |
| `amigo logs [name] [--full]` | Tail logs |
| `amigo help [subcommand]` | Short help |

Unknown flags fail. No prompts. `switch` to the already-active project is success.

### Ports

The catalog is authoritative. Amigo does not guess.

- First block: web **4000**, api **4001**, postgres **5433**
- Next product: **4100** / **4101** / **5434** (web +100, postgres +1)

`amigo run` exports `WEB_PORT`, `API_PORT`, `POSTGRES_PORT`, and rewrites the host port on `DATABASE_URL` from the project’s `.env` if present. Catalog wins over a product’s `.env.example` so two stacks can run together.

### Start / stop (Windows)

Start runs the catalog `start` command in the project directory, detached, with pid under `state/run/<name>` and logs under `state/logs/<name>.log`.

**`amigo stop` stops the tracked Node/pnpm process tree. Compose Postgres stays up.** That matches leaving a local database running between sessions. v1 does not ship `amigo stop --db`.

Docker started with `docker compose up -d` is not torn down by `stop`, because Compose detaches from the tracked tree.

## Layout

```text
AGENTS.md          how Amigo works
catalog.yaml       source of truth for projects and ports
bin/amigo.mjs      CLI
projects/          nested checkouts (gitignored except .gitkeep)
state/current.yaml active drawer
docs/OWNER.md      human flow
```

`projects/*` is gitignored. Nested repos are never added to Amigo’s index. Amigo’s git and each product’s git stay independent.

## First product: Assidua Ops

Assidua Ops is **not** copied into this studio. After you confirm, it will be **moved** (same `.git`, same GitHub remote) to `projects/assidua-ops` and registered with ports 4000 / 4001 / 5433.

Until then, `amigo` correctly reports zero projects.

Do not open Assidua Ops as a second Cursor window for day-to-day work once it lives in a drawer. Open the studio. Talk to Amigo.

## Next product

```powershell
npx amigo add <git-url>
npx amigo switch <name>
npx amigo run
```

No need to copy skills into that repo. Craft skills live here. The product keeps code, specs, and a short `AGENTS.md`.
