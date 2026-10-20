# Active context

_Last updated: 2026-10-20_

## Current focus

**The product book is closed (2026-10-18; [ADR 0021](../decisions/0021-product-book-first.md)).** `docs/product/` holds
every rule, flow, limit and feature with no open question; its page is
https://claude.ai/artifact/LY9U6jrQRo3MfoHTg3JpyN (pinned for the owner; answers and placements sync from its
database). Chapter 10 is the build plan. **Two tracks now run side by side** (ADR 0021 amended 2026-10-19): the design
pass in English (P1: Claude writes the Claude Design prompts, the owner pastes them, Claude checks the canvas) and the
backend to the book (P2). Components in Storybook and the apps wait for design export v0.6. **2026-10-20 was a
backend day:** P2 step 3 (the **Code differs** fixes in the booking engine) finished (#41–#71), P2 step 4 (business
endpoints) began (#72–#80: booking rules, services menu, profile, answering requests, the team's bookings by phone and
walk-in, moving and cancelling, hours and special days), and the owner had the backend reviewed (best practices,
architecture, patterns, the decisions): its 15 findings are being fixed in a planned series (PR 1 #81 and PR 2 #82
merged; PR 3 and PR 4 next; `log/2026-10-20-p2-review-fixes.md`). All api and shared packages, no screens. Nothing is
open at the end of the day.

Where things stand: M0–M2 are merged and released as tags (#20, 2026-10-16): monorepo and CI, `@yeral/ui` (38
components), domain, contract, sdk, an api for every client screen, written to the rules before the book. The api and
Postgres run on the owner's server since 2026-10-19 (not public). yeral.app still serves `apps/legacy`. Design export
v0.5 (in Turkmen) is the newest export; v0.6 (English) is being drawn. The version PR #26 (`@yeral/lib@0.2.0`,
`@yeral/api@0.1.1`, staging removed) is merged. The backend plan (chapter 10, P2) was reviewed on 2026-10-19 against
every **Code differs** line and the built api, and now has steps 0–7; steps 0 (own server only, ADR 0024), 1 (market
settings, `@yeral/domain/market`), 2 (three fixed levels, team rows, invites, ADR 0025) and 3 (2026-10-20) are
done; step 4 is under way. Nothing new is deployed: the server still runs the api from #34; migrations 0004–0025 run
with the next release (the version PR #38 collects the changesets).

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
- 2026-10-17: stop everything and reorganise: first document the whole product (ideas, norms, rules, roles, limits,
  features, MVP in and out, every flow, with visuals) until no question is left; then the full design and
  components/Storybook; then code. Claude Code writes the prompts for Claude Design, the owner pastes them, Claude Code
  reads the canvas to check the result (ADR 0021).
- 2026-10-18: a shared decision room (first a claude.ai page "Karar", then an own app) was considered and dropped: the
  repo stays the record agents read, the product book page stays where the owner answers, and Claude syncs the answers.
  Build an own decisions app only when a second person decides regularly or syncing becomes a bottleneck. Next: the
  owner answers every book question; then an exact plan for yeral.app, the business app, the CMS and the backend,
  including when and what server to buy.
- 2026-10-18 (book answers): Ýeral isn't a Turkmen-only platform: it's built in English, and each country it launches
  in adds its own languages and settings (Turkmenistan first: Turkmen, Russian); ADR 0022. One launch with the client
  site, the business app and the CMS; the team adds the first businesses in the CMS; Ýeral on yeral.app; no average
  bill; businesses may be open past midnight and options stay flexible; the city is a choice (book Q-001–Q-003,
  Q-100–Q-109).
- 2026-10-19: the backend runs alongside the design (the book is closed: ADR 0021 amended); components and the apps
  wait for the design. The owner bought a netcup VPS 1000 (EU) for the first launch and other projects; Claude set it
  up the same day (hardening, a shared Caddy, Postgres and the api; `infra/server/README.md`). Backups to R2 wait.
- 2026-10-18 (book closed): the first launch is an English pilot with Turkmenistan's settings: example businesses
  marked "Example" beside real ones, a nightly-reset demo of the business app, no SMS (codes on screen); the name is
  written *Ýeral*, "Yeral" only where the letter can't be used; a specialist may work without the app (an option, not a
  level). Plan: product book chapter 10.
- 2026-10-18 (book answers, batch 2): the owner answers only critical questions; Claude decides the rest with the
  recommended option and records it ("Claude (delegated)"), and says so where it disagrees (a concern). Two launches:
  first in English on Cloudflare (investors and early users, from Turkmenistan through a VPN; also a portfolio piece),
  then Turkmenistan with Turkmen, Russian and its own servers and database, after investment; one deployment per
  country (ADR 0023). No server to buy for the first launch. Appointments first, tables and classes after the MVP; no
  review-ask SMS; "Başga ýerde", internal statuses and the business PWA in the MVP; client karma later.
- 2026-10-19 (later): Neon isn't needed; work on the VPS. Review the backend plan for gaps, then build the backend
  alongside the design.
- 2026-10-20: build P2 step 3 one PR at a time, each reviewed with `code-review` (fix what it finds) and merged on
  green CI. At the end of the day: stop, summarise, continue in another session.
- 2026-10-20 (later): go on with step 4 the same way; talk in English only (Turkmen product words translated). Then:
  review the backend api for best practices, architecture, patterns and the decisions, and make a plan of fixes; work
  the plan PR by PR (PR 1–4 now, PR 5 with step 7), then step 4 goes on. Save the progress at the end of the session.
- 2026-10-20 (design track): design work goes in small iterations, one main board per prompt (ADR 0021 amended).

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

2026-10-16: [0020](../decisions/0020-local-and-production-only.md) local and production only, no staging.

2026-10-17: [0021](../decisions/0021-product-book-first.md) product book first (`docs/product/`), then design,
Storybook, code; Claude Code writes the Claude Design prompts and checks the canvas.

2026-10-18: [0023](../decisions/0023-one-deployment-per-market.md) one code base, one deployment per market; first
launch on Cloudflare, Turkmenistan later on its own servers ·
[0022](../decisions/0022-english-first-any-country.md) built in English, not bound to one country; each
market adds its languages (supersedes 0016's Turkmen first).

2026-10-19: [0024](../decisions/0024-own-server-docker-caddy.md) the own server runs every app (Docker + Caddy,
Postgres beside the api); no Neon, no Workers for the api (supersedes 0007 for them).

2026-10-20: [0017](../decisions/0017-booking-model.md) revised for complaints ("Gelmedi" from the start until 24 h
after the end and taking the place of an earlier complaint; "Gijä galdy" from the start; others any time). Every
"how" Claude decided while building step 3 is a 20.10.2026 row in the book's chapter 9 marked "Claude (delegated)":
the owner should look them over (Q-270, Q-171, Q-172, Q-156, Q-206 revised, Q-254, Q-126, Q-124, Q-163, A6, Q-113,
Q-267, Q-168, Q-165, Q-127, Q-159, Q-107, Q-120, Q-105). Step 4 and the review fixes added more 20.10.2026 rows: the
booking rules (B-41, B-42), the menu (B-38), the profile (B-37, Q-215), requests (B-19–B-21), the team's bookings
(B-23–B-25), move and cancel (B-26, B-27), hours and special days (B-39, B-40, Q-211), the SMS a booking's changes send
(B-24, B-26: what the client knows, `bookings.told`), and bookings vs an hours save (Q-211).

## Open questions

Product questions now live in **`docs/product/questions.md`**, one ID each (ADR 0021); answer them on the book's page.
Where the old questions went (2026-10-17):

| Old # | Question | Now |
|---|---|---|
| 16, 18 | Moving tables/classes; the round-6 logic gaps | answered by design v0.5 (`docs/design/ROUND6-ANSWERS.md`) |
| 17 | Font sizes 28 / 24 / 80; open past midnight | font sizes: keep the code's mapping (v0.5, H); past midnight: feature F-109 in chapter 6 |
| 1 | Checkout / POS; table/class setup wizard | features F-221 and F-116 in chapter 6; Q-030 |
| 2 | CMS design | Q-010, Q-011, Q-012 |
| 4 | Average bills; store badges | Q-103; feature F-004 |
| 5 | Native copy review | Q-101 |
| 6 | SMS provider and sender name | Q-109; chapter 8 (notifications) |
| 7 | Final name and domain | Q-003 |
| 10 | Real business photos and texts | Q-002 |

## Next steps

The product book is closed (2026-10-18). The build plan is its chapter 10 (`docs/product/10-plan.md`). Two tracks
run side by side (ADR 0021, amended 2026-10-19):

**Design track (P1):** Claude writes each Claude Design prompt (`docs/product/prompts/`), the owner pastes it, Claude
checks the canvas (artifact `Hkq5oyUnRVrRV3XSs7EAtt`, read with the Artifact tool). Rounds 1–3 of export v0.6 are
committed and checked (#65, #77); the work now goes in small iterations, one main board per prompt (chapter 10's P1:
3.1–3.4 fixes, 4a.1–4a.4, 4b.1–4b.7, 5.1–5.3, 6.1–6.2). Next: the owner pastes 3.1–3.4, Claude checks each, then
writes 4a.1 (Home); still open: the Contact Ýeral phone and Telegram, Storybook per design round (owner's call),
republishing the book page. Then P3 components in Storybook → P4 apps.

**Backend track (P2).** The steps are in the book's chapter 10: 0 own server only (done), 1 market settings (done),
2 the business model (done, ADR 0025), 3 the Code differs fixes (done 2026-10-20), **4 business endpoints (under
way)**, 5 admin endpoints (team accounts with a second factor), 6 first-launch mode, 7 before the launch (deploys from
GitHub, backups, alerts, SMS caps). Rules: the book's chapters 4, 5, 7a–7c and 8. How it's
worked: a worktree, a branch and a PR per item, tests with every rule, `code-review` on the PR (fix what it finds),
merge on green CI; a log note `docs/memory-bank/log/2026-10-20-p2-<topic>.md` and a "how" row in chapter 9 per item.

Step 3 done (2026-10-20, #41–#71; details in `log/2026-10-20-p2-*.md` and chapter 10's step 3). Step 4 done so far
(#72–#80): booking rules, services menu, profile with the map pin, answering requests, the team's bookings by phone
and walk-in (free times, undo), moving and cancelling, hours and special days with keep or cancel-and-offer.

**Next, in order:**
1. **The backend review's fix plan** (`log/2026-10-20-p2-review-fixes.md`): PR 3, contract cleanup (a business
   cancel as `businessCancel: { reason, text }` codes instead of server-translated text in `cancelReason`, its offered
   times their own `cancel` source, the `{ tk: '' }` fallback to the market's language); PR 4, structure with no
   behaviour change (`bookings/engine.ts` for the shared engine pieces, `actions.ts` client-only, `repo.ts` files for
   the calendar and hours queries, the team sources and the "heard" window in the domain, one `invalid()`, techContext's
   "Where shared things live" and systemPatterns' module map, the cleanups listed in the note). PR 5 (SMS caps) waits
   for step 7.
2. **Step 4 goes on:** staff schedules and days off over bookings (B-47, reuses keep-or-cancel and
   `pickAlternatives`), removing a specialist (B-50), the calendar day view with blocked time (F-121) and internal
   statuses (F-104, F-133), the client card and search (with the new-booking drawer's prefix matches), reviews (reply,
   report, moderation), photos behind a storage port and the map address search, notifications, the timed jobs (invite
   expiry, the 5-minute warning, the answer time), CSV export.

PR #38 is the version PR: the owner decides when to release.

**Follow-ups, not fixed** (each in its log note): a daily cap or alert on code SMS before SMS go out (100 an hour
per address reaches many numbers); two "send code" taps at once can send two codes; a business's stale record for a
recycled number still applies its marks to the new holder (`clientFor`); a workspace owner's stale account can't
answer "No" (the admin tool needs a way to free the number); an undo of a decline must call `assertWaitingRoom`; the
complaint endpoint must use `canComplain`; a later release drops `users.notify_review_ask` and
`businesses.typical_confirm_minutes`; the reviews list pages by offset. From step 4: the request drawer's alert notes,
the new-booking drawer's prefix matches and a client's usual services come with the client card; the calendar shows a
move's ghost block and busy-elsewhere blocks; "a colleague added a booking" with the business notifications (F-170); a
client's move confirmed to another specialist doesn't tell the specialist it left; the overlap warning for special days
(F-108) is drawn on the screen from the domain's rule. From the review: `assertOpenAt` refuses with no nearest times;
the races it fixed (a booking undone mid-save, a specialist's cancel after a move, the lock order) have no tests (they
need a concurrency harness); the client's move reads the business three times; one loader for a business's hours.

**Server:** `ssh yeral-vps` (the owner allowed `Bash(ssh yeral-vps:*)`); deploy by hand with
`infra/server/README.md` → "Deploying Ýeral by hand". Checked 2026-10-19: Caddy (no sites), Postgres 18.6 with the 4
migrations and the 13 categories only, the api from #34, healthy; firewall SSH/80/443, fail2ban, keys only. Not public
yet (no DNS record), no backups, and the `deploy` user has no key yet (P2 step 7).

**Waiting on the owner:** look over the 20.10.2026 "Claude (delegated)" rows in chapter 9; two concerns there: when a
business moves its address, clients with bookings ahead aren't told (Q-215), and the full amenity list isn't designed
(the demo's four for now); copy `infra/server/edge/Caddyfile` to `/srv/edge` and reload Caddy at the next deploy
(token-link log filter, #49); decide when to release (#38, migrations 0004–0025). Earlier: the main checkout needs `git checkout -- docs/design && git clean -fd docs/design && git
pull`; the unused Hyperdrive config `yeral-production` and the Neon project on their accounts (delete only if asked);
later an R2 token for backups, accounts for error tracking and uptime checks, the DNS records when going public.
