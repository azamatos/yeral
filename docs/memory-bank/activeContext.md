# Active context

_Last updated: 2026-10-13_

## Current focus

Architecture is final after two review rounds with the owner (ADRs 0001–0014). **Next: M0, the monorepo foundation**,
then M1 (design system + Storybook) and M2 (platform: packages, api on Postgres, Docker). Infrastructure before features.
The live site is still the Next.js marketplace at https://yeral.app.

## Owner's direction (2026-10-13)

- Don't optimise for Turkmenistan yet: build a working product on Cloudflare; move to an own server (Docker + nginx,
  Cloudflare for DNS only) when it's bought. Keep the Docker setup ready anyway.
- The name/domain may change (`yeral.com` or a rebrand): keep domains and brand in config.
- The repo stays public until the product is ready.
- Design system with components, Storybook and tests from the start.
- Not satisfied with the first client app: rebuild and polish it (M3) after the foundation.
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
| 1 | Add the design export (`/Users/azamatos/www/yeral/design`, 4.2 MB) to the repo as `docs/design`, so worktrees and other agents can read it? | owner | M1 |
| 2 | What exactly is wrong with the first client app (list of complaints)? | owner | M3 |
| 3 | Which locale owns URLs without a prefix: `ru` or `tk`? | owner | M7 |
| 4 | Final name and domain (`yeral.app`, `yeral.com`, other)? | owner | public launch |
| 5 | Rename the Cloudflare workers.dev subdomain so PR preview URLs can be turned on | owner, dashboard | previews (optional) |
| 6 | Cloudflare API token for CI, stored as a GitHub secret | owner | M0 deploy step |
| 7 | Neon account (free) for the api database | owner | M2 |
| 8 | Subscription and commission prices in manats; when online payment becomes possible | owner | M4 pricing copy |
| 9 | Real salon photos and texts to replace the stock seed | owner | public launch |
| 10 | SMS gateway and push provider for production | owner + research | M8 |

## Next steps

1. M0: move the Next app to `apps/legacy`; workspace + catalog; turbo + generators; `@yeral/config`; lefthook, commitlint,
   Changesets; CI/release/deploy workflows; Renovate; issue templates; branch protection (with the owner's OK).
2. M1: `@yeral/ui` + `apps/storybook` + component tests.
3. M2: packages, api on Postgres, Docker + nginx.
