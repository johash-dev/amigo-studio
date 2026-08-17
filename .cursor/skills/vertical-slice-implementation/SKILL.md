---
name: vertical-slice-implementation
description: Implement one complete business capability end-to-end using the active project's stack and feature layout.
---

# Vertical Slice Implementation

Deliver one vertical business capability at a time.

Use the **active project's** stack and feature layout. Do not assume Nest, Next, Prisma, or any other framework.

Typical order (adapt if the project differs):

```text
backend contract/business logic
→ frontend
→ unit/integration tests
→ E2E for completed user flows
→ validation
```

Parallel work is acceptable only when contracts are stable.

Rules:

- keep ownership inside the feature as the project defines ownership
- reuse existing components
- preserve architecture
- add tests with the slice
- add E2E when the user flow is completed and the project has an E2E tool
- do not start the next slice until current acceptance criteria pass

## Next

`testing-validation`.
