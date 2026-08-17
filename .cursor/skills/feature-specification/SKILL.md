---
name: feature-specification
description: Produce an implementation-ready feature contract connecting requirements, architecture, acceptance criteria, tests, and scope.
---

# Feature Specification

Write the artifact in the **active project** (its `docs/specs` or equivalent). Do not store product specs in studio state.

## Required sections

```text
Feature ID
Objective
Business context
User story
Functional requirements
Non-functional requirements
Acceptance criteria
User-visible behavior
UI contract
API behavior
Data behavior
Authorization
Error states
Edge cases
Dependencies
Constraints
Out of scope
Test requirements
Definition of Done
```

Acceptance criteria must be observable. Prefer Given/When/Then, concrete examples, explicit state transitions and explicit role boundaries.

**UI contract** is required when the feature has user-facing UI. Produce it via `ui-interaction-design` after the behavioral spec draft exists and before human approval / PLAN. If there is no UI, state `UI contract: N/A` with a one-line reason.

A feature is not done merely when code exists. Require applicable acceptance criteria, approved UI contract when UI is in scope, tests, E2E for completed user flows when the project uses E2E, build/type/lint as the project defines them, review and documentation updates.

## Next

`ui-interaction-design` (if UI) then `implementation-planning`.
