# Active context

_Last updated: 2026-10-14_

## Current focus

**M0 and M1 are merged and released** (`@yeral/ui@0.1.0`, storybook.yeral.app); Neon is set up and verified (project
Yeral, Frankfurt, Postgres 18; see `operations.md`). The client site is fully designed (web design v0.3) and **the
business workspace design arrived** (round 4, `docs/design/business/`, reviewed 2026-10-14: ADR 0017 revised, ADR 0018).
**Now: M2** (platform: domain, contract, i18n, lib, sdk, api on Postgres, Docker), in the slices listed under Next steps;
the schema covers the business side too, so M5 doesn't migrate bookings twice. Then M3 (client site), then M5 (business
workspace, unblocked for its round-4 scope).

## Owner's direction

- 2026-10-13: infrastructure first; Cloudflare now, own server (Docker + nginx, Cloudflare for DNS) later; name/domain in
  config; repo public until ready; design system with Storybook and tests; run 2–3 agents in parallel later.
- 2026-10-14: follow the design's site map (marketplace on yeral.app, no landing app); remove the old mobile designs
  entirely ("we have a new design and our own logic"); maps = MapLibre + OpenFreeMap.
- 2026-10-14 (business design round 4, "decided 14.10.2026"): manual confirmation is the default, a business may switch on
  instant confirmation; requests expire after the business's hold time (default 30 min) with 3 alternative times. This
  replaces the morning's "every booking by hand, no instant setting".

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
0012 revised to tokens v0.3.1 + self-hosted Onest · maps MapLibre + OpenFreeMap ·
[0017](../decisions/0017-booking-model.md) revised by the business design: confirm modes, hold time, booking rules,
decline with alternatives, complaints, source `web|app|phone|walkin|ai` ·
[0018](../decisions/0018-business-workspace-model.md) business model: our own staff, memberships, per-business roles and
client records; Better Auth for identity only; a branch is its own business; only verified businesses are public.

## Open questions

| # | Question | Who | Blocks |
|---|---|---|---|
| 1 | Business workspace round 5: analytics, reviews and replies, notification settings, help, billing, B2B landing + pricing, table/class management, checkout (round 4 covers daily work + setup) | owner (Claude Design) | parts of M5 |
| 11 | Client side of the business rules, not drawn yet: decline reason + 3 alternative times to accept in one tap (booking drawer and the SMS link), the expired-request alternatives, a client blocked from online booking. Plan until drawn: show them in the booking detail drawer with time chips; a blocked client gets the "not bookable online" state with "Jaň et" | owner (design) | M3 polish |
| 12 | A new business is "Barlagda" until verified: its link and QR are given at setup step 8. Plan: the public page answers 404 until verified; members see it with a banner | owner | M3/M5 |
| 2 | CMS design (six modules) | owner (Claude Design round 3) | M6 |
| 3 | Manat prices for business plans and commission | owner | B2B pricing page |
| 4 | Real average bills for restaurant cards; official App Store / Google Play badges | owner | M3 polish |
| 5 | Native Turkmen review of all copy; RU/EN drafts written by Claude need a check too | owner | public launch |
| 6 | SMS provider and sender name | owner + research | production SMS (M8) |
| 7 | Final name and domain (`yeral.app`, `yeral.com`, other)? | owner | public launch |
| 9 | Rename the Cloudflare workers.dev subdomain so PR preview URLs can be turned on | owner, dashboard | previews (optional) |
| 10 | Real business photos and texts to replace the demo seed | owner | public launch |

## Next steps

M2 in slices, each one PR merged in order:

1. **M2a `@yeral/domain`**: time, phone, ids and booking codes, enums, lifecycle (confirm modes, holdUntil, transitions,
   client actions, cancel window), hours/exceptions/shifts/breaks, availability (appointment chains + any specialist,
   buffers, step, lead, window, holds; table; class), permissions, geo; legacy rule tests carried over.
2. **M2b `@yeral/lib` + `@yeral/i18n`**: site config, env, ics, links, storage; tk/ru/en shared namespaces, `useFmt()`.
3. **M2c `@yeral/contract`**: zod DTOs, inputs, error codes for every client screen.
4. **M2d `apps/api` foundation**: Hono app, config, Drizzle schema (ADR 0017 + 0018), migrations, local Postgres
   (`pnpm db:up`, `db:setup`), seed from both demo-data files + 13 categories, test harness.
5. **M2e api endpoints**: auth (Better Auth phone, dev code 1234, SMS port), catalog/search/business page/availability,
   bookings, me, reviews, favourites, events, jobs, OpenAPI `/docs`.
6. **M2f `@yeral/sdk`**.
7. **M2g Docker + nginx; api on Cloudflare staging** (Hyperdrive → Neon `stage` branch, `api-stage.yeral.app`): needs the
   owner's OK for the new Cloudflare resources and DNS record.

Then M3: the client site, screen by screen in the design's order.
