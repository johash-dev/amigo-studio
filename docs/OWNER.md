# Owner flow

You talk to **Amigo**. You do not talk to Requirements, Architect, Builder, or the other specialists unless you explicitly want to.

## Desk and drawers

Amigo Studio is the desk. Each git project under `projects/` is a drawer.

- One Cursor window on `C:\Users\Admin\Amigo Studio`
- One active drawer: `state/current.yaml`
- Named project in a message wins over the active drawer
- Product edits belong under `projects/<active>/` unless you are changing the studio itself (CLI, catalog, rules, skills)

## Switch

“Switch to azend-lms” or `/switch azend-lms` or `amigo switch azend-lms`.

Later “fix the test” means azend-lms.

## Parallel run

Two products can be up at once on isolated port blocks.

- `amigo run assidua-ops` → 4000 / 4001 / 5433
- `amigo run azend-lms` → 4100 / 4101 / 5434
- `amigo stop azend-lms` leaves Assidua Ops running

Postgres for a product stays up after `amigo stop` (Compose is not torn down).

## Ship vs scout

- **Ship** — make the change, with evidence
- **Scout** — read, report, do not edit

If you do not say which, Amigo ships the smallest safe change for the active drawer.

## What Amigo will escalate

High-risk work needs your approval: auth, migrations, production, architecture.

Escalations look like:

1. Conflict or unknown
2. Evidence
3. Impact
4. Options
5. Recommendation
6. Exact decision needed
