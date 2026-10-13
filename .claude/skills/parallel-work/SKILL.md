---
name: parallel-work
description: Run a Yeral task alongside other agents without collisions — claim a GitHub issue, work in an own worktree and branch with own ports and database, handle hot-spot files, hand off through a PR and a memory log note. Use when starting or finishing a task while other agents may be working, or when the user mentions parallel agents, worktrees or task lanes.
---

# Parallel work

Decision: ADR 0014. Needs M0 (issues board, `PORT_BASE`, `db:setup`); before that, work on a branch and tell the owner.

## Start

1. `gh issue list --label "status:ready"` → pick one in your lane (platform, client, business, cms) or the one the owner gave you.
   Read its scope (which apps/packages/slices you may touch) and acceptance criteria.
2. Claim it: `gh issue edit <n> --add-label "agent:<your-name>" --remove-label "status:ready" --add-label "status:in-progress"`
   and comment the plan in 2–4 lines.
3. Isolate: Claude Code → worktree tool / `claude --worktree`; otherwise
   `git fetch origin && git worktree add ../yeral-wt/<topic> -b feat/<n>-<topic> origin/main`.
4. In the worktree: `pnpm install`, `export PORT_BASE=3100` (3200, 3300… — one per worktree), `pnpm db:setup`
   (creates database `yeral_<branch>`, migrates, seeds).

## During

- Stay inside the issue's scope. Need to touch something outside it? Comment on the issue first.
- **Hot spots** — `packages/contract`, `packages/ui/src/styles/tokens.css`, `pnpm-workspace.yaml` (catalog), `turbo.json`,
  root configs, `apps/api/src/db/migrations`: make that change a small separate PR, merge it first, then rebase.
- Small commits (Conventional Commits). `git fetch && git rebase origin/main` at least daily and before opening the PR.
- Lockfile conflict: take `origin/main`'s `pnpm-lock.yaml`, run `pnpm install`, commit.
- Migration conflict: re-generate yours on top of `main` (`pnpm db:generate`), never edit a merged migration.

## Finish

1. Checks: `pnpm lint && pnpm lint:fsd && pnpm typecheck && pnpm test` (+ `pnpm e2e` if flows changed).
2. `pnpm changeset` if anything user-visible changed.
3. Memory note: `docs/memory-bank/log/YYYY-MM-DD-<topic>.md` — what changed, decisions (link ADRs), follow-ups. Don't edit
   `activeContext.md` or `progress.md`.
4. `gh pr create` with: `Closes #<n>`, what changed, how to test, screenshots for UI, a **Handoff** section (open ends, risks).
5. After merge: `git worktree remove ../yeral-wt/<topic>`, drop the database (`pnpm db:drop`), label the issue `status:done`.

## Lead session

Folds `log/` notes into `activeContext.md` / `progress.md` (skill `memory-bank`), keeps the board ordered, sequences hot-spot PRs.
