# Memory bank

The project's long-term memory: everything a person or an agent needs to continue the work without the chat history.
Read `activeContext.md` first, then whatever the task touches.

| File | What it holds | Changes |
|---|---|---|
| [projectbrief.md](projectbrief.md) | what Yeral is, the four sites, business model, market constraints, goals | rarely |
| [productContext.md](productContext.md) | product rules, booking lifecycle, flows, mirror screens, glossary | when product rules change |
| [systemPatterns.md](systemPatterns.md) | architecture: monorepo map, FSD rules, data flow, state, rendering, auth, i18n, errors | when architecture changes (with an ADR) |
| [techContext.md](techContext.md) | libraries and versions, shared utils, code conventions, local dev | when a dependency or convention changes |
| [operations.md](operations.md) | environments, domains, CI/CD, versioning and releases, hosting, secrets | when infra changes |
| [activeContext.md](activeContext.md) | the current state only: focus, the owner's rules still in force, the ADR table, next steps (about 130 lines; read by every session) | every work session |
| [progress.md](progress.md) | the history by day ("Done": PRs, quotes, decisions' context) and the roadmap with status | every work session |
| [log/](log) | append-only notes, one file per task or session (`YYYY-MM-DD-<topic>.md`) | during parallel work; folded into the files above by the lead |

Decisions with a "why" live in [`../decisions`](../decisions) (ADRs). The memory bank states the current truth;
ADRs keep the history of how we got there.

## Rules

- Update `activeContext.md` and `progress.md` at the end of every work session (skill `memory-bank`). When several agents
  work in parallel, each writes a `log/` note instead and the lead folds them in (ADR 0014).
- A decision that changes architecture, a library or a process gets an ADR, and the affected memory-bank file is updated in the same commit.
- Write facts, not plans dressed as facts: mark anything not built yet as *planned*.
- Dates are absolute (`2026-10-13`), never "yesterday".
- The repository is public (owner's choice until launch): never commit secrets or personal data.
