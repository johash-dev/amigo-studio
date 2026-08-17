---
name: switch-project
description: Change the active Amigo Studio project by running amigo switch. Use when the human names another drawer or says switch.
---

# Switch project

## Purpose

Point later edits at one drawer.

## Procedure

1. Resolve the project name from the message. If missing, run `npx amigo status` and ask once.
2. Run `npx amigo switch <name>`.
3. Treat later vague requests as that project.
4. Product writes go under `projects/<name>/`.

Already-active is success. Unknown names fail — do not invent a catalog row.

## Next

`studio-run` if they want it started. Otherwise stay put.
