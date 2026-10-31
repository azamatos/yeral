# One agent at a time, no worktree per agent (ADR 0014 amended, 2026-10-31)

- What happened: on 30–31.10 the lead ran four to five agents at once, each in its own git worktree (`isolation:
  worktree`), each running `pnpm check` (lint, FSD lint, types, Vitest, Storybook in Chromium), two of them with
  Playwright, dev servers and a private Postgres. Seventeen worktrees gathered in `.claude/worktrees` (14 GB, ~200k
  files each after `pnpm install`); when Fable's weekly limit cut the agents off, two Postgres servers and two dev
  servers kept running for 21 hours. `fseventsd` (the file-system event journal) and `kernel_task` (the thermal
  governor) sat above 300 % on battery.
- Measured (`usage.py`, 30.10): 164M tokens read for 10 PRs and 4 half-done pieces — ~13M a PR, ~1.6 % of the week;
  a client screen with stories and a review round 17–22M (2–2.7 %), a docs or api PR 3–7M.
- Why parallel isn't worth it here: a PR costs context × calls whether agents run together or one after another;
  together adds rebases, duplicate reads and CI re-runs. Parallelism compresses the clock only, and the weekly limit,
  not the clock, is what stops the work. It also throttles the Mac, so four agents don't even run four times faster.
- The rule (owner): one agent at a time by default, two at most (different packages, within a time window the owner
  set), one on battery; no worktree per agent — a second concurrent agent uses the one shared worktree
  `.claude/worktrees/shared`; checks filtered to the touched package; no local story suite, dev servers or Playwright
  while another agent runs; an agent stops its Postgres and servers before reporting; the lead removes worktrees once
  pushed and runs `~/.claude/skills/agent-runs/cleanup.sh` after every run. The same rules are in the owner's global
  `~/.claude/CLAUDE.md` and the `agent-runs` skill.
- Changed here: ADR 0014, `AGENTS.md` (Token budget, Parallel work), `CLAUDE.md`, the `parallel-work` skill,
  `operations.md`. Cleaned up the same day: 13 worktrees removed (14 GB → 3.3 GB; the four with unmerged work from
  the night stay: `test/e2e-slice-3-flows`, `feat/api-slice-4-gaps`, `feat/ui-slice-4-u1`, `feat/ui-slice-4-u2`), the
  orphaned processes stopped, `.claude/worktrees/.metadata_never_index` so Spotlight skips the folder.
- Left: finish the four parked pieces one or two at a time; the lead's own context stays small (reports, not files).
