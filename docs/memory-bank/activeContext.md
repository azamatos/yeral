# Active context

_Last updated: 2026-10-16_

## Current focus

**M2 is merged** (#12–#19, 2026-10-16) after a code review of every PR: #17–#19 were fixed before merging, the merged
#13–#16 in #21 (each fix with a test that failed first; details in `progress.md`). The api serves every client screen on
Postgres; not deployed (production api comes with M3; no staging, ADR 0020). **Design export v0.4 arrived**: the business
workspace is fully designed (rounds 4–5), design system v0.4 with two new boards and `docs/design/COMPONENTS.md` (the
component map), tokens v0.4 mapped into `@yeral/ui`. **Released 2026-10-16** (#20): `@yeral/ui@0.2.0`, api, domain,
contract, sdk, lib, i18n `0.1.0`, Storybook `0.1.1` — tags and GitHub Releases only; yeral.app still serves
`apps/legacy` until M3 replaces it. **Design round 6 requested** (`docs/design-requests/2026-10-16-round-6.md`, 18 logic
gaps for export v0.5). **Waiting for design export v0.5**: the owner settles the design first; nothing new is built for
yeral.app until it's in.

## Owner's direction

- 2026-10-13: infrastructure first; Cloudflare now, own server (Docker + nginx, Cloudflare for DNS) later; name/domain in
  config; repo public until ready; design system with Storybook and tests; run 2–3 agents in parallel later.
- 2026-10-14: follow the design's site map (marketplace on yeral.app, no landing app); remove the old mobile designs
  entirely ("we have a new design and our own logic"); maps = MapLibre + OpenFreeMap.
- 2026-10-14 (business design round 4, "decided 14.10.2026"): manual confirmation is the default, a business may switch on
  instant confirmation; requests expire after the business's hold time (default 30 min) with 3 alternative times. This
  replaces the morning's "every booking by hand, no instant setting".
- 2026-10-16: review every PR before merging (the agent merges after review and green CI).
- 2026-10-16: Ýeral is free for now (no plans, no commission); no staging, only local and production (ADR 0020); don't
  build the new yeral.app until the design is clarified and exported again (v0.5).

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
| 16 | Moving table and class bookings: "Başga wagta geçir" is drawn on every confirmed booking, but their rule texts only mention cancelling; the api answers `not_bookable` (design round 6, A4) | owner (design) | M3 booking detail |
| 17 | Design v0.4 open items still open: font sizes 28 / 24 / 80 (mapped to h2 / h3 / display for now), businesses open past midnight (billing details are moot while Ýeral is free) | owner (design) | M3 polish |
| 18 | Design round 6 (`docs/design-requests/2026-10-16-round-6.md`; replaces the old questions 11 and 12): client side of declines, expiries, waiting moves, undo failures, phone-only clients, hidden prices, mobile-only login, party limit as a setting, midnight, overlapping special days, unverified businesses, reviews under moderation | owner (Claude Design → export v0.5) | M3 states, M5 |
| 2 | CMS design (six modules) | owner (Claude Design round 3) | M6 |
| 4 | Real average bills for restaurant cards; official App Store / Google Play badges | owner | M3 polish |
| 5 | Native Turkmen review of all copy; RU/EN drafts written by Claude need a check too | owner | public launch |
| 6 | SMS provider and sender name | owner + research | production SMS (M8) |
| 7 | Final name and domain (`yeral.app`, `yeral.com`, other)? | owner | public launch |
| 10 | Real business photos and texts to replace the demo seed | owner | public launch |

## Next steps

1. The owner runs the round-6 request in Claude Design and drops export v0.5 into `docs/design/`.
2. Process v0.5: its CHANGELOG "To do in the repo", rule changes in the domain/api with tests, tokens, memory bank.
3. Then, on the owner's word: `@yeral/ui` from `docs/design/COMPONENTS.md` in its order, and M3 (client site) screen by
   screen, built only from components with stories; the production api ships with it (operations.md).
