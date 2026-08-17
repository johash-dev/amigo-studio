---
name: studio-run
description: Start or stop a product process tree with amigo run / amigo stop. Use when the human wants a stack up or down.
---

# Run / stop

## Purpose

Start or stop one project's tracked process tree on catalog ports.

## Procedure

**Start**

1. Resolve name (message or active project).
2. Run `npx amigo run [name]`.
3. Report pid, ports, and the `next:` URL.
4. If they need logs: `npx amigo logs [name]`.

**Stop**

1. Run `npx amigo stop [name]`.
2. This kills the tracked Node/pnpm tree only.
3. Compose Postgres **stays up**. Do not `docker compose down` unless the human explicitly asks.

## Do not

- invent ports
- start Docker by hand when `amigo run` exists
- stop a different project's tree
- tear down Compose as part of a normal stop

## Next

`status` to confirm. `npx amigo logs [name]` if boot failed.
