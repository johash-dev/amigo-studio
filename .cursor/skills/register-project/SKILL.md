---
name: register-project
description: Clone a git repo into projects/ and register ports via amigo add. Use when the human wants to add a product to the studio.
---

# Register project

## Purpose

Add a drawer. Do not start it.

## Procedure

1. Take `<git-url>` and optional `[name]`.
2. Run `npx amigo add <git-url> [name]` from the studio root.
3. Translate the assigned port block into Owner chrome. Do not paste TOON.
4. Remind: catalog ports win over the product's `.env.example` so two stacks can run together.

## Do not

- copy skills into the new repo
- start the app (`amigo add` does not run)
- restructure the product into `apps/<product>/`
- add a second invented product for demos
- paste TOON into chat

## Output

Owner chrome. Answer names the new project and its web / api / postgres ports. Remind that catalog ports win over `.env.example`.

## Next

`switch-project`, then `studio-run` if they ask to boot it.
