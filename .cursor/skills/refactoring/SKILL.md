---
name: refactoring
description: Perform a bounded structural improvement without changing intended behavior, using tests and small reversible changes.
---

# Refactoring

Refactor only when complexity, duplication, readability or feature boundaries justify it.

Procedure:

1. establish current behavior
2. ensure useful tests
3. define boundary
4. make one structural change
5. validate
6. repeat only with evidence

Start simple. Introduce deeper architecture only inside the feature that needs it.

Never mix unrelated feature work, introduce patterns for their own sake, or rewrite the whole codebase.

## Next

`testing-validation`.
