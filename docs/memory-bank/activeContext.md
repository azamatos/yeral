# Active context

_Last updated: 2026-10-14_

## Current focus

**M1 (design system + Storybook) is built** on `feat/m1-design-system` (see `progress.md`); Neon is linked on
`chore/neon`, waiting for the owner's `neon login`. **M0 is merged and the release path is proven** (version PR #2 → tags → CI deploy of yeral.app → smoke check green,
`/version.json` = `d718e35`). **The web design v0.3 arrived** (`docs/design/`, 14.10.2026): the client site is fully
designed, and the product is now a booking marketplace for any business that sells time. **Next: M2** (platform with the
multi-category model, api on Postgres via Neon, Docker), then M3 (the client site on yeral.app, exactly as designed). Business workspace and CMS wait for their design rounds.

## Owner's direction

- 2026-10-13: infrastructure first; Cloudflare now, own server (Docker + nginx, Cloudflare for DNS) later; name/domain in
  config; repo public until ready; design system with Storybook and tests; run 2–3 agents in parallel later.
- 2026-10-14: follow the design's site map (marketplace on yeral.app, no landing app); the business confirms every booking
  by hand; remove the old mobile designs entirely ("we have a new design and our own logic"); maps = MapLibre + OpenFreeMap.

## Decisions

2026-10-13: [0001](../decisions/0001-monorepo-pnpm-turborepo.md) pnpm + Turborepo ·
[0002](../decisions/0002-vite-tanstack-instead-of-nextjs.md) Vite + TanStack ·
[0004](../decisions/0004-feature-sliced-design.md) FSD ·
[0005](../decisions/0005-typescript-backend-in-monorepo.md) Hono + Postgres/Drizzle + Better Auth ·
[0006](../decisions/0006-contract-and-sdk.md) zod contract + Hono RPC + OpenAPI ·
[0007](../decisions/0007-hosting-cloudflare-now-docker-later.md) Cloudflare now, Docker + nginx later ·
[0008](../decisions/0008-i18n-use-intl.md) use-intl ·
[0009](../decisions/0009-versioning-changesets.md) Changesets ·
[0010](../decisions/0010-ci-cd-github-actions.md) GitHub Actions ·
[0011](../decisions/0011-state-management.md) state ownership ·
[0012](../decisions/0012-design-system-and-storybook.md) design system + Storybook ·
[0013](../decisions/0013-testing-strategy.md) testing ·
[0014](../decisions/0014-parallel-agents.md) parallel agents

2026-10-14: [0015](../decisions/0015-marketplace-on-the-apex.md) marketplace on yeral.app (supersedes 0003) ·
[0016](../decisions/0016-languages-tk-ru-en.md) TK default + RU + EN, prefixed URLs ·
[0017](../decisions/0017-booking-model.md) one booking engine, four types, five statuses, always confirmed by hand ·
0012 revised to tokens v0.3.1 + self-hosted Onest · maps MapLibre + OpenFreeMap.

## Open questions

| # | Question | Who | Blocks |
|---|---|---|---|
| 1 | Business workspace design (multi-staff calendar, bookings table, clients, analytics, B2B pricing page) | owner (Claude Design round 2) | M5 |
| 2 | CMS design (six modules) | owner (Claude Design round 3) | M6 |
| 3 | Manat prices for business plans and commission | owner | B2B pricing page |
| 4 | Real average bills for restaurant cards; official App Store / Google Play badges | owner | M3 polish |
| 5 | Native Turkmen review of all copy; RU/EN drafts written by Claude need a check too | owner | public launch |
| 6 | SMS provider and sender name | owner + research | production SMS (M8) |
| 7 | Final name and domain (`yeral.app`, `yeral.com`, other)? | owner | public launch |
| 8 | Neon account (free) for the api database | owner | M2 |
| 9 | Rename the Cloudflare workers.dev subdomain so PR preview URLs can be turned on | owner, dashboard | previews (optional) |
| 10 | Real business photos and texts to replace the demo seed | owner | public launch |

## Next steps

1. Merge M1; check storybook.yeral.app after the first deploy.
2. Neon: owner runs `npx neon@latest login`; then `neon deploy`, verify the connection, merge `chore/neon`.
3. M2: multi-category `@yeral/domain` + contract, i18n (tk/ru/en), sdk; api on Postgres with the demo seed; Docker + nginx.
4. M3: the client site, screen by screen in the design's order.
