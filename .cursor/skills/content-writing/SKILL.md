---
name: content-writing
description: Write or rewrite human-facing docs (README, onboarding, owner guides) so a new user knows what this is, why it exists, and what to do first.
---

# Content writing

## Purpose

Make a document someone would actually read. Structure and voice first; completeness second.

## Applicability

Use when the task is README, onboarding, OWNER/human docs, landing copy, or other prose for people.

Do not use for `AGENTS.md`, skills, agent prompts, or architecture notes. Prefer `skill-governance` or the specialist who owns that artifact.

## Procedure

1. Name the **reader** (who opens this file, on what day).
2. Write a **promise** they can say back in one sentence.
3. Open with that promise, not a feature list and not a folder map.
4. Name the **pain** in their words, then the flip — one short beat each.
5. Show **one scene of use** (a short conversation or before/after). Not a spec.
6. Give the **smallest path to first success**. Copy-pasteable. No absolute machine paths.
7. Everyday actions in plain language. One reference table is enough; do not repeat it.
8. Link deeper docs. Do not inline ports, shims, or process internals on the first screen.
9. Cut: implementer leftovers, “what this is not” as the lead, internal filenames, duplicate tables, jargon before it is taught.
10. Look: short paragraphs, air between sections, headings that a skimmer can use. A tagline may sit in a blockquote. Do not decorate with badges or HTML unless asked.

## Constraints

- Second person. Short sentences. One idea per paragraph.
- Facts must match the repo (commands, ports, catalog). Invented products only as clearly fake examples.
- Studio README speaks to any user of Amigo. Desk-specific facts belong in `docs/OWNER.md`.
- The README reader is here to work on **their products**. Do not feature editing Amigo itself, “switch to studio”, or other maintainer moves. Those belong in `docs/OWNER.md`.
- Do not advertise runtime architecture in the README (two stacks at once, port blocks, what stop leaves running). That belongs in `docs/cli.md` or `docs/OWNER.md`.
- Owner chrome in chat is for Amigo’s replies, not a thing to dump as the README’s personality.

## Output

The document. Plus:

```text
Reader:
Promise:
First success:
Cuts:
```

## Validation

Read the first screen as a stranger. They should know what this is, why they would care, and the next action. A check that the README has no machine-specific path is appropriate when the audience is public.

## Limitations

This skill does not invent visual design systems or screenshots. It will not fix a product that has no clear job.

## Next

Stay put unless the human asked to implement something else in the same doc set (`docs/cli.md`, `docs/OWNER.md`).
