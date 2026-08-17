---
name: status
description: Show live Amigo Studio status via the amigo CLI. Use when the human asks what is active, running, or which ports are in use.
---

# Status

## Purpose

Report the desk: where we are, what is registered, running, ports, health.

## Procedure

1. From the Amigo Studio root, run `npx amigo status` (same as `npx amigo`).
2. Translate that output into Owner chrome. Do not paste TOON or JSON.
3. Where is **Studio** if `active` is `none`, else the project name. Mode is Scout unless they also asked to change something.
4. In **Answer**, name each project with running yes/no and catalog ports. Follow the CLI `next:` as **Next** unless they asked something else.

## Do not

- guess ports
- scrape `docker ps` or `Get-Process` as the source of truth
- load craft skills for a status question
- dump raw CLI output into chat

## Output

Owner chrome, then running/ports in Answer, evidence = `npx amigo status`.

## Next

If they want a different drawer: `switch-project`. If they want it running: `studio-run`.
