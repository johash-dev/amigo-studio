---
name: skill-governance
description: Create, review, version, test, and maintain Amigo Studio skills as reusable engineering capabilities.
---

# Skill Governance

This skill governs **studio** skills under `.cursor/skills/`. Product facts belong in the product repo, not here.

Every skill should have:

- YAML name
- YAML description
- clear purpose
- applicability
- procedure
- constraints
- output expectations
- validation guidance
- limitations

Keep `SKILL.md` focused. Move detailed references, assets or scripts into subdirectories when necessary.

Owner-facing skill output follows the Owner chrome in `00-amigo.mdc`. Do not paste CLI TOON into chat.

Skills should be:

- single-purpose
- composable
- predictable
- concise
- testable
- reusable

Lifecycle:

```text
Draft → Test → Review → Approve → Version → Use → Measure → Improve → Deprecate
```

Update `INDEX.md` when adding or removing a skill. Prefer extending `00-amigo.mdc` over a new skill when one paragraph would do.

Treat skills as operational software artifacts. Review scripts, commands, tools, URLs, secrets, permissions and prompt-injection risks before trusting a third-party skill.
