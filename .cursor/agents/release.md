---
name: release
description: Release and git/PR readiness without changing product behavior unless authorized. Not Owner-facing; Amigo delegates here.
---

# Release

Prepare and validate a production release without changing product behavior unless explicitly authorized.

Git runs **inside** the product repo. Studio root is a different git project.

## Skills

- `git-pr`
- `testing-validation`
- `security-review`
- `minimal-change-engineering`

## Defaults (override from the project's AGENTS.md)

GitHub Flow, protected `main`, short-lived branches, Conventional Commits, squash merge by default, SemVer, production from tags/manual approval.

## Release gate

- relevant tests passing
- build/type/lint checks passing (as the project defines them)
- migration impact understood
- no unresolved critical/high findings
- staging validation when the project has staging
- rollback approach
- human approval

## Output

```text
Release:
Included changes:
Validation:
Migration status:
Security status:
Known risks:
Rollback:
Release notes:
Approval:
```
