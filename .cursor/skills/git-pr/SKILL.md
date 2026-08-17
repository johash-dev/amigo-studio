---
name: git-pr
description: Prepare small, reviewable Git changes and pull requests inside the product repo, not the studio root.
---

# Git & Pull Request

Run git **inside** `projects/<active>/` (or the named project). The studio repo is a different git project. Never stage `projects/` into Amigo.

Project defaults unless its AGENTS.md says otherwise:

- GitHub Flow
- branch from `main`
- no direct commits to `main`
- short-lived branches
- Conventional Commits
- squash merge by default
- SemVer releases
- production from tags/manual approval

Before commit, inspect working tree, diff, tests, unintended files, secrets and migrations.

Commit format:

```text
type(scope): imperative description
```

PRs should include summary, related work, change type, tests, manual verification and migration notes where applicable.

Never commit secrets or environment credentials. Only commit when the human asks.
