# Owner flow

You talk to **Amigo**. Specialists stay behind Amigo unless you ask for one by name.

Onboarding and commands live in the [README](../README.md). This file is the daily map for **this** desk.

## This desk

- Cursor window: this Amigo Studio checkout
- Registered product: `assidua-ops` (ports 4000 / 4001 / 5433)
- Active product: `state/current.yaml` (`none` means Studio)
- Named product in a message wins over the active one
- Product edits: `projects/<active>/` — studio edits: CLI, catalog, rules, skills
- Dashboard: say **Hola Amigo** or `/dashboard` — `http://127.0.0.1:3999/`
- After UI edits: `npm run dashboard:build`. Live UI: sidecar up, then `npm run dashboard:dev` (3998)

Do not open Assidua Ops as a second Cursor window for day-to-day work. Open the studio. Talk to Amigo.

## Switch

- “Switch to assidua-ops” — later “fix the test” means Assidua Ops
- “Switch to studio” or `amigo switch none` — later product edits stay off until you name a product again

A second product would get the next port block (4100 / 4101 / 5434). Stopping one leaves the other running. Postgres stays up after `amigo stop`.

## Ship vs scout

- **Ship** — make the change, with evidence
- **Scout** — read, report, do not edit

If you do not say which, Amigo ships the smallest safe change for the active product (or the studio, when you are on Studio).

## What Amigo replies look like

Every reply starts with where you are, scout vs ship, and what Amigo is allowed to edit. Then the answer, what it did, evidence, and a next step.

Example after “switch to studio”:

- **Where:** Studio
- **Mode:** Ship
- **Allowed:** studio files
- **Answer:** You’re on the studio. Product folders will not be edited.
- **Next:** Name the studio change you want.

When no product is selected, Amigo says **Studio**, not `none`.

## What Amigo will escalate

High-risk work needs your approval: auth, migrations, production, architecture.

Escalations look like:

1. Conflict or unknown
2. Evidence
3. Impact
4. Options
5. Recommendation
6. Exact decision needed
