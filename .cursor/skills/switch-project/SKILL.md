---
name: switch-project
description: Change the active Amigo Studio project by running amigo switch. Use when the human names another drawer or says switch.
---

# Switch project

## Purpose

Point later edits at one drawer.

## Procedure

1. Resolve the project name from the message. If missing, run `npx amigo status` and ask once.
2. If they say studio, desk, or none, run `npx amigo switch none` (or `studio`). That leaves the product drawer. Later vague product writes are blocked until they switch to a named project. Studio files (CLI, catalog, rules, skills) may still be edited.
3. Otherwise run `npx amigo switch <name>`.
4. Treat later vague requests as that project.
5. Product writes go under `projects/<name>/`.

Already-active is success. Unknown names fail — do not invent a catalog row.

A switch request only switches, unless they asked to implement something.

## Output

Owner chrome for the **new** Where. Say **Studio** when switched to `none`. State what may be edited now. Do not paste TOON.

## Next

`studio-run` if they want it started. Otherwise stay put.
