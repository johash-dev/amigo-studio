---
name: testing-validation
description: Design and execute meaningful deterministic validation for a software change. Read the project's own test runner; do not assume a framework.
---

# Testing & Validation

Tests are evidence of behavior.

Read test commands from the **active project's** `package.json` and `AGENTS.md`. Do not assume Jest. Do not assume Vitest. If the project uses Playwright, Cypress, or nothing for E2E, follow that.

## Procedure

1. Map acceptance criteria to tests.
2. Identify business-rule tests.
3. Identify authorization boundaries.
4. Identify data/transaction behavior.
5. Identify critical user flows.
6. Add tests with implementation.
7. Run deterministic checks.
8. Investigate failures.
9. Record evidence (command + result).

Never delete or weaken tests just to make CI green. Never claim a test passed without running it.

## Next

`code-review` or `debugging`.
