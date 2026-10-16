# Active context

_Last updated: 2026-10-16_

## Current focus

**M2 is merged** (#12–#19, 2026-10-16) after a code review of every PR: #17–#19 were fixed before merging, the merged
#13–#16 in #21 (each fix with a test that failed first; details in `progress.md`). The api serves every client screen on
Postgres; not deployed (staging: owner said "not yet", open question 13). **Design export v0.4 arrived**: the business
workspace is fully designed (rounds 4–5), design system v0.4 with two new boards and `docs/design/COMPONENTS.md` (the
component map), tokens v0.4 mapped into `@yeral/ui`. **Next**: grow `@yeral/ui` from `COMPONENTS.md` in its order
(extend the existing components, then the new primitives), then M3 (client site) screen by screen; M5 after.

## Owner's direction

- 2026-10-13: infrastructure first; Cloudflare now, own server (Docker + nginx, Cloudflare for DNS) later; name/domain in
  config; repo public until ready; design system with Storybook and tests; run 2–3 agents in parallel later.
- 2026-10-14: follow the design's site map (marketplace on yeral.app, no landing app); remove the old mobile designs
  entirely ("we have a new design and our own logic"); maps = MapLibre + OpenFreeMap.
- 2026-10-14 (business design round 4, "decided 14.10.2026"): manual confirmation is the default, a business may switch on
  instant confirmation; requests expire after the business's hold time (default 30 min) with 3 alternative times. This
  replaces the morning's "every booking by hand, no instant setting".
- 2026-10-16: review every PR before merging (the agent merges after review and green CI); api staging not yet.

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
| 1 | Business workspace: checkout / POS and a table/class setup wizard aren't designed (round 5 covered the rest) | owner (Claude Design) | parts of M5 |
| 11 | Client side of the business rules, not drawn yet: decline reason + 3 alternative times to accept in one tap (booking drawer and the SMS link), the expired-request alternatives, a client blocked from online booking. Plan until drawn: show them in the booking detail drawer with time chips; a blocked client gets the "not bookable online" state with "Jaň et" | owner (design) | M3 polish |
| 13 | **Go-ahead for api staging on Cloudflare** (2026-10-16: "not yet"): the Neon branch `stage`, a Hyperdrive config (`--caching-disabled`), the Worker `yeral-api-stage` on `api-stage.yeral.app` (a new DNS record); then CI deploys it on every green push to `main` | owner | api staging |
| 15 | Staging and production share session cookies (`Domain=yeral.app`): a separate staging domain (recommended, with question 7), or api-host-only `__Host-` cookies everywhere (revises ADR 0019) | owner | api staging |
| 16 | Moving table and class bookings: "Başga wagta geçir" is drawn on every confirmed booking, but their rule texts only mention cancelling; the api answers `not_bookable` | owner (design) | M3 booking detail |
| 17 | Design v0.4 open items (`docs/design/CHANGELOG.md` §6, business README §24): Topar trial behind "Synap gör", Ýeral's bank and company details, support phone, Telegram link, font sizes 28 / 24 / 80 (mapped to h2 / h3 / display for now), businesses open past midnight | owner | B2B pricing, billing |
| 12 | A new business is "Barlagda" until verified: its link and QR are given at setup step 8. Plan: the public page answers 404 until verified; members see it with a banner | owner | M3/M5 |
| 2 | CMS design (six modules) | owner (Claude Design round 3) | M6 |
| 3 | Manat prices: Topar `[PRICE]` TMT a month and the commission `[X]%` (two plans + a commission layer, productContext) | owner | B2B pricing page, billing |
| 4 | Real average bills for restaurant cards; official App Store / Google Play badges | owner | M3 polish |
| 5 | Native Turkmen review of all copy; RU/EN drafts written by Claude need a check too | owner | public launch |
| 6 | SMS provider and sender name | owner + research | production SMS (M8) |
| 7 | Final name and domain (`yeral.app`, `yeral.com`, other)? | owner | public launch |
| 9 | Rename the Cloudflare workers.dev subdomain so PR preview URLs can be turned on | owner, dashboard | previews (optional) |
| 10 | Real business photos and texts to replace the demo seed | owner | public launch |

## Next steps

1. `@yeral/ui` from `docs/design/COMPONENTS.md` in its suggested order: extend the existing components (SideNav, Button,
   Input/Field, Chip, Table, Drawer/Modal, StatusBadge, Toast), then the new primitives, each with stories for every
   state on its board.
2. M3: the client site (`apps/client`, TanStack Start + FSD) on the sdk, screen by screen in the design's order, built
   only from components that have stories; MSW handlers for stories with the first screens.
3. With the owner's OK: api staging (open questions 13 and 15; steps in `operations.md`).
