---
name: security-review
description: Review software changes for authentication, authorization, input validation, secrets, data exposure, dependency, and destructive-operation risks.
---

# Security Review

Check against the **active project's** auth model (read its architecture / AGENTS.md). Typical checks:

- server-side authorization
- authentication boundaries
- role and tenancy/scoping rules the project actually has
- input validation
- output/data exposure
- secret handling
- unsafe logging
- persistence misuse
- dependency risk
- command/file execution
- external integrations
- migrations
- destructive operations
- agent/tool prompt injection

Never remove an authorization or validation check to make a test pass.
