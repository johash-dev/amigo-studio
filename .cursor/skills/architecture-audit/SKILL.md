---
name: architecture-audit
description: Audit an existing codebase or feature against the project's architecture rules and identify concrete violations, risks, and simplification opportunities.
---

# Architecture Audit

Read the active project's architecture (AGENTS.md, docs/architecture, ADRs). Audit against **those** rules, not studio opinions.

Typical checks (skip any the project does not use):

- feature/module ownership
- dependency direction
- business logic placement
- persistence boundaries
- cross-feature communication
- shared-code discipline
- file/function size
- naming
- validation
- authorization
- testing
- external-provider isolation
- configuration
- architectural drift

Do not perform fixes unless explicitly requested.

Output:

```text
Finding:
Location:
Rule:
Evidence:
Severity:
Minimal correction:
Do now / defer:
```

## Next

`code-review` or `minimal-change-engineering`.
