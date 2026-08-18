# Amigo skill routing

Load this index first. Do not load every skill. Choose the smallest matching workflow, then follow its next pointer.

## Studio ops

| Skill | Trigger | Typical next |
|---|---|---|
| status | what is running / active / ports | — |
| switch-project | change the active drawer | status |
| register-project | add a git repo to the studio | switch-project |
| studio-run | start or stop a product stack | status |
| studio-dashboard | Hola Amigo / dashboard / open the studio page | — |

## Craft (active project)

| Skill | Trigger | Typical next |
|---|---|---|
| grill-requirements | ambiguous request | feature-specification |
| codebase-comprehension | need to understand code before changing it | architecture-design, implementation-planning |
| architecture-design | design a change against existing architecture | feature-specification |
| architecture-audit | check a feature against project architecture | code-review |
| feature-specification | implementation-ready contract | ui-interaction-design, implementation-planning |
| ui-interaction-design | screens, flows, roles, states | implementation-planning |
| content-writing | README, onboarding, human-facing docs | — |
| implementation-planning | small dependency-aware plan | vertical-slice-implementation |
| vertical-slice-implementation | one end-to-end capability | testing-validation |
| minimal-change-engineering | keep the diff small | — (pair with any implement/fix skill) |
| testing-validation | evidence of behavior | code-review |
| code-review | independent review | security-review |
| security-review | authz, secrets, injection, data | — |
| debugging | reproducible failure | testing-validation |
| refactoring | bounded structural improvement | testing-validation |
| git-pr | branch, commit, PR inside the **project** repo | — |
| handoff-context | compact continuation for another agent | — |
| skill-governance | create or change a **studio** skill | — |

Routing rule: if a request spans multiple skills, load one primary skill first. Never preload all skills just to choose a path.

Skills are procedures. They do not replace launching a specialist. When `.cursor/agents/amigo.md` routing names an agent, launch `.cursor/agents/<name>.md` (Task `subagent_type` = YAML `name:`). Studio ops skills stay with Amigo.
