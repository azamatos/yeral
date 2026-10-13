---
name: memory-bank
description: Keep Yeral's project memory current — docs/memory-bank (active context, progress, patterns, tech, operations, log notes) and docs/decisions (ADRs). Use at the end of every work session, right after any decision about architecture, libraries, process or product rules, when folding parallel agents' log notes, or when the user says "update memory bank" / "remember this for the project".
---

# Memory bank

The repo's memory (`docs/memory-bank`, `docs/decisions`, `AGENTS.md`) holds project facts for every person and agent.
An agent's private memory holds only how to work with the owner. Don't duplicate between them.

## End of a session (working alone)

1. Read `activeContext.md` and `progress.md`.
2. `activeContext.md`: set `_Last updated_` to today's date; rewrite "Current focus"; add decisions taken today (with ADR
   links); move answered questions out of "Open questions"; refresh "Next steps".
3. `progress.md`: mark milestones and items done with the date and commit hashes; add bugs or gaps found but not fixed.
4. Code changed a pattern, a library or a helper → update `systemPatterns.md` / `techContext.md` ("Where shared things live").
5. Infra changed → `operations.md`. Agent rules changed → `AGENTS.md`.
6. Commit `docs: update memory bank` (together with the work when it's the same change).

## Working in parallel with other agents

Don't touch `activeContext.md` or `progress.md`. Write `docs/memory-bank/log/YYYY-MM-DD-<topic>.md`:

```md
# <topic> (#<issue>, <branch>)
- Changed: …
- Decided: … (ADR NNNN if any)
- Follow-ups: …
```

**Lead folding notes:** read every `log/*.md` merged into `main`, fold them into `activeContext.md` / `progress.md`
(and other files if needed), delete the folded notes, commit `docs: fold memory log`.

## A decision was made

1. Copy `docs/decisions/_template.md` to the next number; fill Context / Decision / Consequences / Alternatives, with sources.
2. Add a row to `docs/decisions/README.md`.
3. Update the memory-bank file the decision affects. A replaced decision gets `Superseded by NNNN`, never deleted.

## Style

- Facts and current state; anything not built yet is marked *planned*.
- Absolute dates (`2026-10-13`). Short sentences, tables for lists of facts.
- The repository is public: no secrets, no personal data.
