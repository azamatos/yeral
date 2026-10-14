# Active context

_Last updated: 2026-10-14_

## Current focus

**M0 (monorepo foundation) is merged** (PR #1, `76a218b`; see `progress.md`). The release path is proven end to end
(2026-10-14): version PR #2 merged → tags `@yeral/legacy@0.1.1`, `@yeral/config@0.0.1` + GitHub Releases → CI deployed
yeral.app → smoke check green (`/version.json` = `d718e35`). **Next: M1, design system +
Storybook**, then M2 (platform: packages, api on Postgres, Docker). Infrastructure before features. The live site is still
the Next.js marketplace (`apps/legacy`) at https://yeral.app; from now on it deploys through the release workflow.

## Owner's direction (2026-10-13)

- Don't optimise for Turkmenistan yet: build a working product on Cloudflare; move to an own server (Docker + nginx,
  Cloudflare for DNS only) when it's bought. Keep the Docker setup ready anyway.
- The name/domain may change (`yeral.com` or a rebrand): keep domains and brand in config.
- The repo stays public until the product is ready.
- Design system with components, Storybook and tests from the start.
- Not satisfied with the first client app: rebuild and polish it (M3) after the foundation.
- Design export added to the repo as `docs/design/` (owner's request).
- Wants to understand every choice (the "why" is in `docs/decisions` and `techContext.md`) and to run 2–3 agents in parallel later.

## Decisions (2026-10-13)

[0001](../decisions/0001-monorepo-pnpm-turborepo.md) pnpm + Turborepo ·
[0002](../decisions/0002-vite-tanstack-instead-of-nextjs.md) Vite + TanStack Start/Router ·
[0003](../decisions/0003-four-sites-on-subdomains.md) four sites + api + storybook ·
[0004](../decisions/0004-feature-sliced-design.md) FSD ·
[0005](../decisions/0005-typescript-backend-in-monorepo.md) Hono + Postgres/Drizzle + Better Auth from the start ·
[0006](../decisions/0006-contract-and-sdk.md) zod contract + Hono RPC + OpenAPI ·
[0007](../decisions/0007-hosting-cloudflare-now-docker-later.md) Cloudflare now, Docker + nginx later ·
[0008](../decisions/0008-i18n-use-intl.md) use-intl ·
[0009](../decisions/0009-versioning-changesets.md) Changesets ·
[0010](../decisions/0010-ci-cd-github-actions.md) GitHub Actions ·
[0011](../decisions/0011-state-management.md) state ownership (Query / URL / TanStack Form / useState / Zustand) ·
[0012](../decisions/0012-design-system-and-storybook.md) design system + Storybook ·
[0013](../decisions/0013-testing-strategy.md) testing ·
[0014](../decisions/0014-parallel-agents.md) parallel agents

## Open questions

| # | Question | Who | Blocks |
|---|---|---|---|
| 1 | What exactly is wrong with the first client app (list of complaints)? | owner | M3 |
| 1a | **Desktop/web extension of DS v2** (in progress by the owner in Claude Design): web foundations (breakpoints, grid, states, density), web components (header, sidebar, table, menus, date picker…), desktop screens — business first (all-staff calendar, requests, clients, settings), then client and landing. The export replaces `docs/design/` | owner | M3, M5 (not M0/M1 primitives) |
| 2 | Which locale owns URLs without a prefix: `ru` or `tk`? | owner | M7 |
| 3 | Final name and domain (`yeral.app`, `yeral.com`, other)? | owner | public launch |
| 4 | Rename the Cloudflare workers.dev subdomain so PR preview URLs can be turned on | owner, dashboard | previews (optional) |
| 5a | Install the Renovate GitHub App for this repo (github.com/apps/renovate) | owner | dependency PRs |
| 6 | Neon account (free) for the api database | owner | M2 |
| 7 | Subscription and commission prices in manats; when online payment becomes possible | owner | M4 pricing copy |
| 8 | Real salon photos and texts to replace the stock seed | owner | public launch |
| 9 | SMS gateway and push provider for production | owner + research | M8 |

## Next steps

1. M1: `@yeral/ui` + `apps/storybook` + component tests (`pnpm gen ui-component`), Storybook on `storybook.yeral.app`.
2. M2: packages (`domain` with the existing tests, `contract`, `i18n`, `lib`, `sdk`), api on Postgres, Docker + nginx.
