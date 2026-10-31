---
name: parallel-work
description: Run a Yeral task as one of at most two agents without collisions — claim a GitHub issue, work on an own branch (the shared worktree with own ports and database when a second agent runs), keep checks filtered and clean up processes and worktrees, handle hot-spot files, hand off through a PR and a memory log note. Use when starting or finishing a task while another agent may be working, when deciding whether to run a second agent at all, or when the user mentions parallel agents, worktrees or task lanes.
---

# Parallel work

Decision: ADR 0014 (amended 2026-10-31: one agent at a time by default, two at most, one on battery; no worktree per
agent). Before starting a second agent, ask: does the owner want speed within a time window, and do the two tasks
touch different packages? If not, run the tasks one after another — the tokens are the same, the Mac stays cool. Needs M0 (issues board, `PORT_BASE`, `db:setup`); before that, work on a branch and tell the owner.

## Start

1. `gh issue list --label "status:ready"` → pick one in your lane (platform, client, business, cms) or the one the owner gave you.
   Read its scope (which apps/packages/slices you may touch) and acceptance criteria.
2. Claim it: `gh issue edit <n> --add-label "agent:<your-name>" --remove-label "status:ready" --add-label "status:in-progress"`
   and comment the plan in 2–4 lines.
3. Alone: branch in the main checkout (`git switch -c feat/<n>-<topic> origin/main`). The second concurrent agent uses
   the shared worktree: `git worktree add .claude/worktrees/shared -b feat/<n>-<topic> origin/main` if it doesn't exist,
   otherwise `git -C .claude/worktrees/shared switch -c feat/<n>-<topic> origin/main`; never `isolation: worktree` per
   agent.
4. In the shared worktree only: `pnpm install` once (it stays installed), `export PORT_BASE=3100`, `pnpm db:setup`
   (database `yeral_<branch>`).

## During

- Stay inside the issue's scope. Need to touch something outside it? Comment on the issue first.
- **Hot spots** — `packages/contract`, `packages/ui/src/styles/tokens.css`, `pnpm-workspace.yaml` (catalog), `turbo.json`,
  root configs, `apps/api/src/db/migrations`: make that change a small separate PR, merge it first, then rebase.
- Small commits (Conventional Commits). `git fetch && git rebase origin/main` at least daily and before opening the PR.
- Lockfile conflict: take `origin/main`'s `pnpm-lock.yaml`, run `pnpm install`, commit.
- Migration conflict: re-generate yours on top of `main` (`pnpm db:generate`), never edit a merged migration.

## Finish

1. Checks filtered to what you touched (`pnpm check --filter=@yeral/<name>...`, `pnpm test:stories --filter` for your
   stories); the whole suite and `pnpm e2e` run in CI. No dev servers, Storybook or Playwright locally while another
   agent runs. Stop your Postgres and servers (`pg_ctl stop`, the dev processes) before you report.
2. Memory note: `docs/memory-bank/log/YYYY-MM-DD-<topic>.md` — what changed, decisions (link ADRs), follow-ups. Don't edit
   `activeContext.md` or `progress.md`.
3. `gh pr create` with: `Closes #<n>`, what changed, how to test, screenshots for UI, a **Handoff** section (open ends, risks).
4. After the push: the shared worktree switches back to `main` (`git -C .claude/worktrees/shared switch main`) and is
   kept; any other worktree is removed at once; drop the database (`pnpm db:drop`); label the issue `status:done`.

## Lead session

Folds `log/` notes into `activeContext.md` / `progress.md` (skill `memory-bank`), keeps the board ordered, sequences hot-spot PRs.

Tokens and the machine (`AGENTS.md` → "Token budget"): size the run against what's left of the week's limit; one agent
at a time, two at most, one on battery. Drop an agent whose context is full (or whose PR merged) and start a fresh one
from its PR and log note; never resume a full agent with its whole context. After every run: `ps` for leftover
Postgres, dev servers, Vitest or Chromium, and the owner's `~/.claude/skills/agent-runs/cleanup.sh` (stops them,
removes worktrees whose branch is pushed).
