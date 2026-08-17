---
name: minimal-change-engineering
description: Reduce unnecessary code, abstractions, files, dependencies, and refactoring while preserving correctness, security, and required behavior.
---

# Minimal Change Engineering

Before adding code, ask whether the problem can be solved by:

1. reusing existing code
2. changing existing behavior locally
3. deleting unnecessary code
4. simplifying an existing path

Search existing features, shared code, sibling implementations and tests before creating anything.

Rule of Three:

- one feature: keep local
- two features: keep local if practical
- three or more: consider shared extraction

Ponytail-inspired constraints:

- comprehension before modification
- YAGNI
- reuse before rewrite
- preserve validation and safety checks
- prefer the smallest coherent diff

Never optimize line count at the expense of correctness or safety.
