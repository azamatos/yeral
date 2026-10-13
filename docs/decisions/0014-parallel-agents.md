# 0014. Working with several agents in parallel

- Status: Accepted 2026-10-13
- Decided by: owner (2–3 agents in parallel in future) + Claude

## Context

The owner plans to run 2–3 coding agents at once (Claude Code sessions, possibly other tools). Without rules they'd
edit the same files, collide on dev-server ports and databases, and overwrite each other's memory-bank notes.

## Decision

- **Instructions for every agent tool** live in `AGENTS.md` (tool-agnostic); `CLAUDE.md` imports it and adds Claude specifics.
- **Tasks are GitHub Issues** (board: GitHub Project). One issue = one task with scope (apps/packages/slices it may
  touch) and acceptance criteria. An agent claims a task by adding the label `agent:<name>` and moving it to *In progress*.
- **One task = one git worktree + one branch** (`feat/<issue>-<topic>`), never work on `main` directly.
  Claude Code: `claude --worktree` / worktree isolation; others: `git worktree add ../yeral-wt/<topic> -b <branch>`.
- **No collisions in local runs**: `PORT_BASE` env per worktree (3000, 3100, 3200…; each app adds its offset);
  one local Postgres container, one database per worktree (`pnpm db:setup` creates `yeral_<branch>`).
- **Hot spots** go first, in their own small PRs, and are announced on the issue: `packages/contract`, `packages/ui`
  tokens, `pnpm-workspace.yaml` catalog, `turbo.json`, root configs, migrations. Lockfile conflicts are resolved by
  rebasing and running `pnpm install`.
- **Integration only through PRs**: CI green and branch up to date with `main` before a squash merge.
- **Memory bank without conflicts**: during a task an agent doesn't edit `activeContext.md` or `progress.md`; it adds an
  append-only note `docs/memory-bank/log/YYYY-MM-DD-<topic>.md` (what changed, decisions, follow-ups) and a handoff in the
  PR. The lead session folds notes into `activeContext.md`/`progress.md` after merges (skill `memory-bank`).
- **Suggested lanes**: platform (monorepo, CI, Docker, packages, api), client app, business app. The skill `parallel-work` is the checklist.

## Consequences

- A little ceremony per task (issue, worktree, PR), in exchange for parallel work that doesn't break `main`.
- The owner sees all work on the GitHub Project board.

## Alternatives considered

- **Agents sharing one checkout**: constant conflicts on files, ports and databases.
- **A tasks file in the repo**: merge conflicts on every claim; issues are atomic.
