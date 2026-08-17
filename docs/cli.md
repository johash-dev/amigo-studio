# CLI reference

The catalog (`catalog.yaml`) is the source of truth for ports. Amigo does not guess.

## Commands

| Command | What it does |
| --- | --- |
| `amigo` / `amigo status` | Live status (not a help page) |
| `amigo switch <name>` | Set the active product (`none` / `studio` leaves it) |
| `amigo add <git-url> [name]` | Clone into `projects/<name>`, assign ports, do not start |
| `amigo run [name]` | Start named or active product |
| `amigo stop [name]` | Stop that product’s Node/pnpm tree |
| `amigo logs [name] [--full]` | Tail logs |
| `amigo help [subcommand]` | Short help |

Unknown flags fail. No prompts. Switching to the already-active product is success.

Slash commands `/status` `/switch` `/run` `/stop` `/add` call the same CLI.

## Ports

- First product: web **4000**, api **4001**, postgres **5433**
- Next product: **4100** / **4101** / **5434** (web +100, postgres +1)

`amigo run` exports `WEB_PORT`, `API_PORT`, `POSTGRES_PORT`, and rewrites the host port on `DATABASE_URL` from the product’s `.env` if present. Catalog wins over a product’s `.env.example` so two stacks can run together.

## Start / stop

Start runs the catalog `start` command in the product directory, detached, with pid under `state/run/<name>` and logs under `state/logs/<name>.log`.

**`amigo stop` stops the tracked Node/pnpm process tree. Compose Postgres stays up.** That matches leaving a local database running between sessions. There is no `amigo stop --db` yet.

Docker started with `docker compose up -d` is not torn down by `stop`, because Compose detaches from the tracked tree.

On Windows, `amigo run` puts `bin/win-shims` on PATH so nested `pnpm` scripts work without a global pnpm (the shim calls `corepack pnpm`).

## Optional `amigo` on PATH

Studio only, not a global publish:

```powershell
npm link
amigo
```

Or always: `npx amigo` / `npm run amigo`.

## Layout

```text
AGENTS.md            how Amigo is instructed
catalog.yaml         products and ports
bin/amigo.mjs        CLI
projects/            nested checkouts (gitignored except .gitkeep)
state/current.yaml   active product (`none` = Studio)
docs/OWNER.md        daily flow at this desk
docs/cli.md          this file
```

`projects/*` is gitignored. Nested repos are never added to Amigo’s index. Amigo’s git and each product’s git stay independent.
