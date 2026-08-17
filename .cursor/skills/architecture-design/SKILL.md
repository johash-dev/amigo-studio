---
name: architecture-design
description: Design a minimal, project-consistent technical solution for a feature or change after understanding the existing architecture.
---

# Architecture Design

## Principle

Change the smallest architectural surface that safely solves the problem.

Read the **active project's** architecture, ADRs, and `AGENTS.md`. Do not assume another product's stack.

## Procedure

1. Read authoritative architecture in the project.
2. Inspect affected implementation.
3. Identify existing boundaries.
4. Identify reusable patterns.
5. Determine API/data/UI/security impact.
6. Compare reasonable alternatives.
7. Select the simplest compatible design.
8. Record material decisions in the project if it keeps ADRs.

## Never

- introduce microservices for convenience
- introduce broad clean architecture prematurely
- add speculative abstractions
- redesign unrelated features

## Output

Current architecture, affected boundaries, proposed design, files/components, contracts, data changes, security, testing, risks, alternatives and decision.

## Next

`feature-specification` or `implementation-planning`.
