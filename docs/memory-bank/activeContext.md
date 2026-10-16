# Active context

_Last updated: 2026-10-14_

## Current focus

**M0 and M1 are merged and released** (`@yeral/ui@0.1.0`, storybook.yeral.app); Neon is set up and verified (project
Yeral, Frankfurt, Postgres 18; see `operations.md`). The client site is fully designed (web design v0.3) and **the
business workspace design arrived** (round 4, `docs/design/business/`, reviewed 2026-10-14: ADR 0017 revised, ADR 0018).
**M2 is built** as a stack of PRs waiting to merge in order: #13 domain → #14 lib + i18n → #15 contract → #16 api
foundation → #17 api endpoints → #18 sdk → #19 Docker + Workers (each one's details in `progress.md`). The api serves every
client screen on Postgres (30 paths, 51 API tests); the schema covers the business side too, so M5 doesn't migrate
bookings twice. Not deployed yet: staging needs the owner's OK (open question 13). Then M3 (client site), then M5
(business workspace, unblocked for its round-4 scope).

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
client records; a branch is its own business; only verified businesses are public ·
[0019](../decisions/0019-own-phone-login-and-sessions.md) (in PR #16) own phone-code login and database sessions
instead of Better Auth (the design's attempts/lock/resend rules, no placeholder e-mails, endpoints in the contract).

## Open questions

| # | Question | Who | Blocks |
|---|---|---|---|
| 1 | Business workspace round 5: analytics, reviews and replies, notification settings, help, billing, B2B landing + pricing, table/class management, checkout (round 4 covers daily work + setup) | owner (Claude Design) | parts of M5 |
| 11 | Client side of the business rules, not drawn yet: decline reason + 3 alternative times to accept in one tap (booking drawer and the SMS link), the expired-request alternatives, a client blocked from online booking. Plan until drawn: show them in the booking detail drawer with time chips; a blocked client gets the "not bookable online" state with "Jaň et" | owner (design) | M3 polish |
| 13 | **Go-ahead for api staging on Cloudflare**: create the Neon branch `stage`, a Hyperdrive config on it, and the Worker `yeral-api-stage` on `api-stage.yeral.app` (a new DNS record); then CI deploys it on every green push to `main` | owner | api staging |
| 14 | Merging the M2 stack: the auto-mode permission classifier blocks `gh pr merge` for the agent, so the owner merges #12–#19 in order (squash), or allows merges for the agent | owner | M2 done |
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

1. Merge #12 (this review), then the M2 stack #13 → #19 in order; after each squash merge the next PR is rebased on
   `main` (a docs conflict in `progress.md` / `systemPatterns.md` / `techContext.md` is expected and trivial).
2. With the owner's OK: api staging on Cloudflare (open question 13; steps in `operations.md`).
3. M3: the client site (`apps/client`, TanStack Start + FSD) on the sdk, screen by screen in the design's order; MSW
   handlers for stories with the first screens; the client serves the demo photos (`/media/demo`).

Then M3: the client site, screen by screen in the design's order.
