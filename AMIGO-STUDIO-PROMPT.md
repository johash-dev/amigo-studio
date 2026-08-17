# Implementation prompt — Amigo Studio

This document is the locked design from a design review of Assidua Ops, Forge Workspace, AXI, TOON, Aspire, and firstmate. Implement it. Do not reopen the architecture unless a locked decision is physically impossible on Windows.

---

## Mission

Create **Amigo Studio**: a Cursor workspace that is a **host for multiple product repos**. The human talks to one companion named **Amigo**. Assidua Ops is the first product inside the studio, still its own git repo, still `apps/web` + `apps/api`.

Amigo Studio is **not** a rename of Assidua Ops. It is not a pnpm `apps/assidua-ops` nest. It is a desk with labeled drawers. Each drawer is a separate git project. Two stacks can run at once on isolated ports.

**You (the implementing agent) create the studio.** Do not wait for a pre-existing Amigo folder unless the human already made an empty one.

---



## Hard constraints

1. **Create** `C:\Users\Admin\Amigo Studio` (space in the name, same pattern as `C:\Users\Admin\Forge Workspace`). If that path already exists and is not empty, stop and ask.
2. **Do not** restructure Assidua Ops into `apps/assidua-ops/{web,api}`. Product layout stays `apps/web` and `apps/api`.
3. **Do not** copy Forge, firstmate, AXI, or Aspire into the studio as a dump. Steal principles. Write Amigo’s own files.
4. **Do not** make Assidua Ops a git submodule of Amigo.
5. **Do not** clone a second living copy of Assidua Ops that will drift from `C:\Users\Admin\Work\assidua-ops`.
6. **Do not** put Assidua product specs, ADRs, Prisma, or feature skills that mention Rivon/Rover/staff roles as facts into Amigo as if they were universal.
7. **Do not** add Aspire, MCP servers, tmux crews, or firstmate’s watcher in v1.
8. Machine is **Windows** (PowerShell). No tmux. Process start/stop must work on Windows.
9. Amigo’s git and Assidua Ops’ git stay **independent**. Amigo `.gitignore`s `projects/` (except a `.gitkeep`).
10. **Move Assidua Ops last**, and only with explicit human confirmation. Until then, implement the studio against a catalog entry that points at the current path, or register after the move. Do not `git mv` the human’s open workspace out from under them without asking.
11. Follow **ponytail** from Assidua Ops: smallest thing that works, no unrequested frameworks, one runnable check for non-trivial logic.
12. The human’s product work continues in Assidua Ops. Do not “clean up” taxonomy, CI, or specs as part of this task.

---



## Locked decisions


| Decision               | Lock                                                                                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Host path              | `C:\Users\Admin\Amigo Studio`                                                                                                                       |
| Product name           | Amigo Studio                                                                                                                                        |
| Who the human talks to | **Amigo** (not Orchestrator, Contractor, firstmate, Topoi)                                                                                          |
| CLI                    | `amigo`                                                                                                                                             |
| Layout                 | Nested checkouts: `projects/<name>/`                                                                                                                |
| Studio thickness       | Thin studio: catalog + CLI + Cursor agent layer. Not a crew runtime. Not one Aspire AppHost for all products.                                       |
| First project          | Assidua Ops, moved to `projects/assidua-ops` (same `.git`, same GitHub remote, same CI)                                                             |
| Assidua ports          | Keep **4000** (web), **4001** (api), **5433** (Postgres). Next product gets the next block (4100 / 4101 / 5434).                                    |
| Skills                 | **Generic craft + studio ops live in Amigo.** Each project keeps only product facts (code, specs, short `AGENTS.md`).                               |
| Specialist roles       | Live in Amigo as Cursor agents. Human does not talk to them by default.                                                                             |
| Aspire                 | Later, **inside a project** that outgrows Compose. Not in v1.                                                                                       |
| firstmate              | Steal: one liaison, `projects/` folder, ship vs scout as a *way of speaking*, worktrees later. Do not clone the distro.                             |
| Forge                  | Steal: `AGENTS.md`, tiny rules, skill INDEX, evidence before “done”, stop hook, pointer state (`current.yaml`). Do not copy `.contractor/` schemas. |
| AXI / TOON             | `amigo` with no args prints live status, short fields, explicit empty states, next-step hint. Prefer this over MCP.                                 |


---



## Mental model (teach this in README + AGENTS.md)

The studio is a desk. Each project is a drawer. The human works in one drawer at a time unless they name another.

- Open `C:\Users\Admin\Amigo Studio` in Cursor.
- Talk to **Amigo**.
- “Start assidua-ops” / `amigo run` starts **that** repo’s Compose + `pnpm dev` on **that** row’s ports.
- “Switch to azend-lms” changes the active project. Later edits go only there.
- Two `amigo run`s means two process trees. `amigo stop azend-lms` leaves Assidua Ops up.
- Commits never mix products: they are different git repos.

Vague “fix the test” means the **active** project in `state/current.yaml`.

---



## Target tree

```text
C:\Users\Admin\Amigo Studio\
  AGENTS.md
  README.md
  catalog.yaml
  package.json                 # Node CLI package, private
  .gitignore
  .cursor\
    agents\
      amigo.md                 # only human-facing agent
      requirements.md
      architect.md
      builder.md
      reviewer.md
      debugger.md
      release.md
      research.md
      test.md
      uiux.md
    commands\
      status.md
      switch.md
      run.md
      stop.md
      add.md
    hooks.json
    rules\
      00-amigo.mdc             # alwaysApply: liaison, project boundary, evidence, no loops
      10-ponytail.mdc          # alwaysApply: smallest safe change (adapt from Assidua Ops)
    skills\
      INDEX.md
      <studio ops skills>
      <craft skills, generalized>
  bin\
    amigo.mjs                  # or src/cli.mjs — one entry the package.json bin maps to
  docs\
    OWNER.md                   # human flow (desk / drawers / switch / parallel run)
  projects\
    .gitkeep
    assidua-ops\               # after confirmed move only
  state\
    .gitkeep
    current.yaml               # gitignored or committed with active: none until first switch
    run\                       # gitignored pid/log files
    logs\                      # gitignored
```

`projects/*` is gitignored except `.gitkeep`. Nested repos must never be added to Amigo’s index.

---



## `catalog.yaml` (source of truth)

Amigo does not guess ports. The catalog is authoritative.

Shape:

```yaml
projects:
  assidua-ops:
    path: projects/assidua-ops
    origin: <existing git remote URL, fill from the repo at move time>
    ports:
      web: 4000
      api: 4001
      postgres: 5433
    health: http://localhost:4001/api/health
    start: docker compose up -d && pnpm install && pnpm db:migrate && pnpm dev
    stop: null                 # if null, Amigo kills the tracked process tree only
```

Rules:

- Project **name** is the catalog key and the folder name under `projects/`.
- `amigo add <git-url> [name]` clones into `projects/<name>`, assigns the **next unused port block** (start at 4000, step 100 for web; api = web+1; postgres = 5433 + projectIndex), appends the catalog, does not start the app.
- If the human adds a project whose own `.env.example` already defines ports, **catalog wins** for isolation. Document that `amigo run` exports catalog ports into the child env (`WEB_PORT` / `API_PORT` / `DATABASE_URL` host port) so two products can run together. For Assidua Ops v1, keep its existing env names: `WEB_PORT`, `API_PORT`, `DATABASE_URL` with `localhost:5433` for the first project.
- Do not invent a second product in the catalog. Only `assidua-ops` in v1.

`state/current.yaml`:

```yaml
active: assidua-ops
```

If missing or `active` is empty, `amigo` still lists projects; mutating commands that omit a name must fail with a clear error: set active with `amigo switch <name>`.

---



## CLI contract (`amigo`)

Small Node CLI in the studio repo. AXI-inspired. Non-interactive. No prompts. Unknown flags fail loud. Idempotent where it matters (`switch` to the already-active project is success).


| Invocation                   | Behavior                                                                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `amigo`                      | **Content first.** Print live status: active project, registered projects, ports, running yes/no, health if a URL exists. Not a help page. |
| `amigo status`               | Same as no-args.                                                                                                                           |
| `amigo switch <name>`        | Write `state/current.yaml`. Fail if name unknown.                                                                                          |
| `amigo add <git-url> [name]` | Clone, port block, catalog row. Default name from repo.                                                                                    |
| `amigo run [name]`           | Start named or active project. Record pid tree under `state/run/<name>`.                                                                   |
| `amigo stop [name]`          | Stop that project’s tracked tree only.                                                                                                     |
| `amigo logs [name]`          | Tail recent log file for that project.                                                                                                     |
| `amigo help [subcommand]`    | Concise per-command help (AXI principle 10).                                                                                               |


Output:

- Prefer **TOON** ([https://toonformat.dev/](https://toonformat.dev/)) for structured status if you can add `@toon-format/toon` (or the current official package) without drama. If the package is a mess on Windows, use a **TOON-like indentation format you control** (headers, field lists, rows). Do not dump 10+ JSON fields per project. Default list fields: `name`, `active`, `running`, `web`, `api`.
- Truncate logs; `--full` on `logs` if you implement an escape hatch.
- Empty catalog: explicit `projects: 0` plus next-step `amigo add <git-url>`.
- After success, one line of **next step** (e.g. `amigo run assidua-ops`).

`package.json` bin: `amigo` so `pnpm exec amigo` / `npx amigo` works from the studio root. Document installing the bin or using `pnpm amigo`. Keep it local to the studio; do not require a global npm install unless it is a one-line optional convenience.

**Start/stop on Windows:** spawn the start command in the project directory with catalog env, detached enough that the CLI can exit and the stack stays up, pid recorded, `stop` kills the process tree (including child `node` / `docker` is **not** torn down unless you started compose as part of that tree). For Assidua Ops, `docker compose up -d` should stay up across `amigo stop` **or** you document that `stop` also `docker compose stop` for that project only. Pick one and write it in README: recommended: `amigo stop` **stops the Node/pnpm dev processes; Compose Postgres stays up** unless `amigo stop --db`. v1 may omit `--db` and leave Postgres running (cheaper, matches current Assidua habit).

One runnable check: a script or test that parses a fixture catalog and asserts port allocation / TOON-like status for zero projects and one project. No giant framework.

---



## Cursor agent layer



### `AGENTS.md` (always loaded)

Must state:

1. The human talks to **Amigo** only.
2. Authority: human > project specs/ADRs inside the active project > studio conventions > implementation guesses.
3. Active project from `state/current.yaml`. Named project in the message wins.
4. **Edit fence:** unless the human is changing the studio itself, Amigo may write product files only under `projects/<active>/`. Catalog/CLI/rules are studio files.
5. Load **one** skill from `INDEX.md`, not all skills.
6. For product work, also read the active project’s `AGENTS.md`, README, and `docs/` as needed. Do not copy those docs into studio state.
7. Evidence before “done”. Do not weaken tests to get green.
8. Bounded recovery: do not retry the same failing strategy more than three times; then escalate.
9. High-risk (auth, migrations, production, architecture) needs explicit human approval — this rule travels with every project.
10. Progressive disclosure: pass paths and IDs, not entire specs, when delegating to specialists.



### Rules

- `00-amigo.mdc`: alwaysApply. Liaison, edit fence, evidence, no infinite loops, escalate with conflict / evidence / impact / options / recommendation / exact decision needed.
- `10-ponytail.mdc`: alwaysApply. Copy the ladder from `C:\Users\Admin\Work\assidua-ops\.cursor\rules\ponytail.mdc` (YAGNI, reuse, stdlib, smallest diff, one check). It applies to every project unless that project’s `AGENTS.md` tightens it.

Keep rules tiny. Project facts do not belong in always-on rules.

### Commands (slash)

Each command is a short instruction file that tells Amigo to run the equivalent `amigo` subcommand and report. Do not reimplement the CLI in markdown.

- `/status` → `amigo status`
- `/switch` → `amigo switch`
- `/run` → `amigo run`
- `/stop` → `amigo stop`
- `/add` → `amigo add`



### Hooks

`.cursor/hooks.json`:

- `stop`: a small script that does not block the human, but if the last turn claimed completion, warn when `state/current.yaml` has an active project and no evidence was mentioned. Keep this conservative (Forge’s stop hook is non-blocking). Python or Node; Node is preferred because the studio already has Node for the CLI.
- Skip `preCompact` / tool-failure logging unless it is a few lines. v1 is allowed to ship **only** a stop hook.



### Cursor agents

- `amigo.md`: the only Owner-facing agent. Control loop: understand → (studio CLI | load one craft skill) → maybe delegate → verify → update `current.yaml` if they switched → report.
- Specialists: adapt `C:\Users\Admin\Work\assidua-ops\agents\01-*.md` through `09-*.md` into `.cursor/agents/`. Strip Assidua-only product facts. Keep role + skills + when to use. They are **not** Owner-facing.
- Do **not** keep a separate “orchestrator” agent. That role **is** Amigo.

---



## Skills

Two groups, both under `.cursor/skills/` with an `INDEX.md` (Forge pattern: load index first, one skill, follow next).

### A. Studio ops (write these)

Minimum:

- `switch-project`
- `register-project` (wraps `amigo add`)
- `run-project` / `stop-project` (may be one `studio-run` skill)
- `status`

These teach Amigo to use the CLI, not to shell-script docker by hand.

### B. Craft (move up from Assidua Ops, then generalize)

Copy from `C:\Users\Admin\Work\assidua-ops\skills\<name>/SKILL.md` into Amigo `.cursor/skills/<name>/`, then **edit** so they are product-agnostic:


| Skill                         | Change                                                                                                                                                             |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| grill-requirements            | Keep. Authority is the **active project’s** requirements/docs.                                                                                                     |
| codebase-comprehension        | Scope to `projects/<active>/`.                                                                                                                                     |
| architecture-design           | Read the active project’s architecture/ADRs.                                                                                                                       |
| architecture-audit            | Same.                                                                                                                                                              |
| feature-specification         | Same.                                                                                                                                                              |
| implementation-planning       | Same.                                                                                                                                                              |
| vertical-slice-implementation | Keep the slice idea. Do not hardcode Nest/Next; say “use the project’s stack and feature layout.”                                                                  |
| minimal-change-engineering    | Keep.                                                                                                                                                              |
| testing-validation            | **Remove Jest as a fact.** Read the project’s test commands from its package.json / AGENTS.md. Assidua Ops uses **Vitest** + Playwright.                           |
| code-review                   | Keep.                                                                                                                                                              |
| security-review               | Keep.                                                                                                                                                              |
| debugging                     | Keep.                                                                                                                                                              |
| refactoring                   | Keep.                                                                                                                                                              |
| git-pr                        | GitHub Flow still fine; run git **inside** the project repo, not studio root.                                                                                      |
| handoff-context               | Pointers to paths/IDs, not pasted novels. Handoff files live in the **project** if they are product work (`docs/` or a small `handoff/` the project already uses). |
| skill-governance              | Now governs **studio** skills.                                                                                                                                     |
| ui-interaction-design         | Keep screens/flows/states. **Do not hardcode** Admin / DH / Front Desk / technician link. Say: read roles from the active project’s architecture/requirements.     |


Do **not** copy Forge’s 20 lifecycle skills wholesale. You may **borrow names/ideas** (test-integrity, recover, evidence) as short extra skills if they fit in a few screens of markdown. Prefer extending `00-amigo.mdc` over a new skill when one paragraph would do.

After the move, **delete or replace** Assidua Ops’ root `skills/` and `agents/` with a short pointer: “Craft skills and Amigo live in Amigo Studio. This repo keeps product facts.” Add a short `AGENTS.md` **in Assidua Ops** (stack, spec index, ports, “open via Amigo Studio”). Do not delete `docs/specs` or ADRs. Only do this pointer-cut **after** skills exist in Amigo and the human confirms, so the product repo is not skill-less in the gap.

If the human wants Assidua Ops to stay self-contained for GitHub clones, leave `skills/` in place and still put the canonical copies in Amigo. **Default (locked): canonical craft skills live only in Amigo** after the confirmed cutover.

---



## What stays in Assidua Ops (the drawer)

After move: `C:\Users\Admin\Amigo Studio\projects\assidua-ops`

- `apps/web`, `apps/api`, Prisma, Playwright, CI
- `docs/requirements`, `docs/architecture`, `docs/specs`, `docs/plans`, `docs/design`
- `.cursor/rules` may keep a one-liner “opened via Amigo” or be removed so studio ponytail is the only always-on rule when the studio is the workspace root. Nested `.cursor/rules` may not load; **do not rely on them**. Put stack facts in the project `AGENTS.md`.

Do not extract `packages/` for mobile. `pnpm-workspace.yaml` already globs `apps/*`. Mobile later is `apps/mobile` **inside Assidua Ops**, not a second studio project unless it is a separate product.

---



## Inspiration — read, do not vendor


| Source        | Path / URL                                                                                     | Steal                                                                                                                                                                                        |
| ------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Forge         | `C:\Users\Admin\Forge Workspace`                                                               | `AGENTS.md`, `.cursor/skills/INDEX.md`, tiny rules, `docs/TOKEN-EFFICIENCY.md`, non-blocking stop hook, escalation format. Ignore `.contractor/` artifact store (Assidua already has specs). |
| Assidua Ops   | `C:\Users\Admin\Work\assidua-ops`                                                              | Craft skills, agent role docs, ponytail, first catalog row (ports, start command).                                                                                                           |
| AXI           | [https://github.com/kunchenguid/axi](https://github.com/kunchenguid/axi)                       | 10 principles: TOON, 3–4 fields, truncation, aggregates, empty states, structured errors, ambient then skill, content-first, next steps, consistent help.                                    |
| TOON          | [https://toonformat.dev/](https://toonformat.dev/)                                             | Encoding for `amigo status`.                                                                                                                                                                 |
| Aspire        | [https://aspire.dev/](https://aspire.dev/)                                                     | Mental model: one topology per **product**. Not v1.                                                                                                                                          |
| Aspire skills | [https://aspire.dev/get-started/aspire-skills/](https://aspire.dev/get-started/aspire-skills/) | How a host installs skills into `.cursor` / `.agents`. Do not run `aspire agent init` on the studio in v1.                                                                                   |
| firstmate     | [https://github.com/kunchenguid/firstmate](https://github.com/kunchenguid/firstmate)           | `projects/` checkouts, one liaison, ship vs scout language. No tmux/crew/Relay.                                                                                                              |


---



## Assidua Ops move (final step, human confirms)

1. Studio CLI, catalog, AGENTS.md, skills, and `amigo status` work on an empty `projects/` (status shows `projects: 0`).
2. Ask the human to close Cursor workspaces that have `Work\assidua-ops` open, or confirm they accept a move.
3. **Move** (not copy) `C:\Users\Admin\Work\assidua-ops` → `C:\Users\Admin\Amigo Studio\projects\assidua-ops`. Same `.git`. `git remote -v` unchanged. `git status` must still be the product’s dirty/clean state, not a new repo.
4. Register catalog row `assidua-ops` with ports 4000/4001/5433 and start command matching Assidua README (`docker compose up -d`, `pnpm`, migrate, `pnpm dev`).
5. `amigo switch assidua-ops` then `amigo run`. Human should see smoke at [http://localhost:4000/](http://localhost:4000/) and health at [http://localhost:4001/api/health](http://localhost:4001/api/health) (or via Next rewrite `/api/health`).
6. Optional: human deletes any backup copy. You do not delete `Work\assidua-ops` leftovers except as part of the move.
7. Then the pointer-cut in the product repo (`AGENTS.md`, skills location) if the human still wants canonical skills only in Amigo.

If move is too risky in the session, stop after the studio works and print exact move commands for the human.

---



## Implementation order

1. Create `C:\Users\Admin\Amigo Studio`, `git init`, `.gitignore`, README, `docs/OWNER.md`.
2. `catalog.yaml` (empty `projects:`), `state/` gitignore rules, `projects/.gitkeep`.
3. `amigo` CLI: status / switch / add / run / stop / logs + one fixture check.
4. `AGENTS.md`, rules, INDEX, studio-ops skills, slash commands, `amigo.md` agent, hooks.
5. Copy and generalize craft skills + specialist agents from Assidua Ops.
6. Stop hook.
7. **Pause.** Show the human how to open the folder in Cursor and run `amigo`.
8. Move Assidua Ops only after confirmation.
9. Product `AGENTS.md` pointer + skills cutover only after confirmation.

Init a **new git remote only if the human asks**. Do not push.

---



## v1 non-goals

- Aspire AppHost, `aspire agent init`, dashboard as the studio
- firstmate crew, worktrees automation, tmux/herdr/zellij/orca
- Forge `.contractor/` REQ/DEC/EVD files
- MCP servers
- A second product besides Assidua Ops (catalog must **support** a second product; do not add one)
- Mobile app, `packages/` shared types
- Global npm publish of `amigo`
- Rewriting Assidua Ops architecture or finishing AO-F-002

---



## Verification (must actually run)

From `C:\Users\Admin\Amigo Studio`:

- `amigo` with empty catalog prints explicit zero projects and a next step (not a crash, not `--help` dump).
- After a fake or real `assidua-ops` row, `amigo status` shows name + ports + active flag in a compact format.
- `amigo switch` refuses unknown names.
- Fixture/unit check for port-block assignment (second project would get 4100/4101/5434).
- README: open in Cursor, talk to Amigo, first-day flow.
- After move (if done): `git -C projects/assidua-ops remote -v` still points at the product origin; `amigo run` brings up the known URLs.

---



## Success

The human opens **one** Cursor window on Amigo Studio, talks to **Amigo**, can start Assidua Ops without remembering ports, and the next product can be `amigo add <url>` without copying 17 skills into that repo.

If anything in this prompt conflicts with a physical Windows or Cursor limitation, keep the mental model (desk, drawers, one friend, isolated ports) and change the smallest implementation detail. Do not collapse Amigo Studio back into the Assidua Ops repo.