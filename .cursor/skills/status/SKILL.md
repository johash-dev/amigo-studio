---
name: status
description: Show live Amigo Studio status via the amigo CLI. Use when the human asks what is active, running, or which ports are in use.
---

# Status

## Purpose

Report the desk: active drawer, registered projects, ports, running, health.

## Procedure

1. From the Amigo Studio root, run `npx amigo status` (same as `npx amigo`).
2. Report the CLI output. Do not reformat into a long JSON dump.
3. Follow the `next:` line unless the human asked something else.

## Do not

- guess ports
- scrape `docker ps` or `Get-Process` as the source of truth
- load craft skills for a status question

## Next

If they want a different drawer: `switch-project`. If they want it running: `studio-run`.
