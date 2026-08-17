---
name: debugging
description: Diagnose a reproducible software failure using evidence, isolate the root cause, add regression coverage, and apply the smallest safe fix.
---

# Debugging

```text
Observe → Reproduce → Localize → Hypothesize → Test → Root cause → Regression test → Fix → Validate
```

Prefer failing tests, logs, stack traces, traces, data/state evidence and then source inspection.

Rules:

- reproduce before changing when practical
- do not guess when evidence can be collected
- fix root cause
- preserve safeguards
- add regression coverage
- keep the fix scoped

Escalate after three similar failed attempts or when architecture changes are required.

## Next

`testing-validation`.
