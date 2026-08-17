---
name: studio-dashboard
description: Open or stop the Amigo Studio localhost dashboard via amigo dashboard. Use when the human says Hola Amigo, asks for the dashboard, or uses /dashboard.
---

# Dashboard

## Purpose

Open the studio dashboard in the browser. The CLI is the feature; chat just runs it.

## Procedure

1. From the Amigo Studio root, run `npx amigo dashboard` (stop: `npx amigo dashboard stop`).
2. Translate pid/port/url into Owner chrome. Do not paste TOON.
3. The page is `http://127.0.0.1:3999/`. It lists catalog products, Run/Stop, health, ports, and resource usage. It does not switch the active drawer or add projects.

Match **Hola Amigo** case-insensitively, including extra punctuation or spaces.

## Do not

- start product stacks just because the dashboard opened
- bind anything other than loopback
- scrape Docker by hand when the page already shows Compose stats
- paste TOON into chat

## Output

Owner chrome. Answer includes the local URL. Evidence = `npx amigo dashboard`.

## Next

If they want a product up: `studio-run`. If they want the page gone: `npx amigo dashboard stop`.
