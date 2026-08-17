---
name: code-review
description: Independently review a change against its specification, architecture, security, testing, maintainability, and scope.
---

# Code Review

Review the diff in the active project:

1. requirement coverage
2. architecture
3. business logic
4. authorization
5. data integrity
6. error handling
7. tests
8. performance
9. maintainability
10. scope
11. AI failure patterns

Look for invented APIs, duplicate functionality, unnecessary abstractions, dead code, hidden behavior changes, broad rewrites, weak tests and speculative features.

Return:

```text
Verdict:
Findings:
Evidence:
Required changes:
Optional changes:
```

Do not reject code merely because a different implementation style is preferred.
