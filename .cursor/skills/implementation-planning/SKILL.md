---
name: implementation-planning
description: Create a small, dependency-aware implementation plan from an approved feature specification and existing codebase.
---

# Implementation Planning

A good plan makes implementation boring. Plan against the active project's files.

1. Read the specification.
2. Read architecture rules in the project.
3. Trace existing implementation.
4. Identify exact files/components.
5. Reuse existing patterns.
6. Split into independently verifiable steps.
7. Order by dependency.
8. Define validation after each meaningful increment.

For every step record:

```text
Goal:
Files:
Existing pattern:
Change:
Dependencies:
Validation:
Risk:
```

Keep steps small and avoid speculative files or unrelated cleanup.

## Next

`vertical-slice-implementation`.
