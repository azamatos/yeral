# Active context

_Last updated: 2026-10-21_

## Current focus

**2026-10-21: the backend stack and P4 slice 1 are merged.** GitHub Actions started no job from 22:53 UTC on 20.10
(account billing) until the owner made the repo public on 21.10. The 12 backend PRs that waited (P2 steps 4–7) were
then rebased and merged in order by web-b2: #112 the setup wizard's draft, #116 photos, #117 the 5-minute warning and
invites' expiry, #120 "Floor, room", #122 the Ýeral team's sign-in (ADR 0026), #123 verify, send back, hide, #124
reported reviews, #125 close a workspace, #126 add a business for its owner, #127 the first launch's examples and
appointments only, #128 a business's SMS limits, #129 the sitemap data. Migrations 0031–0038 came in that order
(0033 and 0035 were replaced in review: a development database migrated on an early commit of #117 or #122 must be
set up again). On the way: the deleted changesets went into `log/2026-10-21-releases-paused.md` ("Unreleased"), the
apps' stand-in accounts got `photo: null`, and #122's admin test of the try limits got a 60 s timeout (PBKDF2 at
600,000 rounds ran past 20 s on CI). P4 slice 1 (accounts) is built: the business app with its sign-in, shell and My
account, the client site with its login and profile (#99, #102, #107, #108, #110, #111, #113–#115, #118, #119, #121,
#131; book chapter 10). Later the same day: Ýeral's support line (#134; the owner's phone and Telegram until Ýeral has
its own, in `MARKET.support`; Contact Ýeral in the business app, the examples' phone), the flaky demo-bookings test
fixed (#135: the seed's generated codes never take a design code), and main at a2e0418 deployed to the server by hand
(Server, below). The day's lesson, from the owner: at a wall, stop, notify, wait (the global CLAUDE.md, "Walls" and
"Unattended runs").

Where things stand: M0–M2 are merged and released as tags (#20, 2026-10-16). Releases are paused until the MVP works
(#133, ADR 0009 amended; the `release` skill is now `ship`): no versions or changesets, and production goes by hand when
the owner asks. The api and Postgres run on the owner's server since 2026-10-19 (not public), the api at a2e0418 since
2026-10-21; yeral.app still serves `apps/legacy`. P2: steps 0–3 done; step 4 done but the business logo and the map
address search; step 5 (admin endpoints) done; step 6 has the examples and appointments only (the demo workspace, F-242,
isn't built); step 7 has the SMS limits and the sitemap data. P4: slice 1 done, slice 2 (business setup) next. The
design redraw stopped (ADR 0021 amended 2026-10-20): the apps are built from the book and the drawn boards, and Claude
Design is used only for a critical undrawn detail. The frontend (web-b2) builds slice by slice: components in Storybook,
then the apps.

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
- 2026-10-20 (later): move on from design to building; design only when it's critical (Claude Design for an undrawn
  detail only); build slice by slice: components in Storybook, then the apps (ADR 0021 amended).
- 2026-10-21: backend and api only in this session (design in another); clients hear when a business moves (done in
  #86); release when possible, without waiting for the design, Storybook or the frontend.
- 2026-10-21 (later): the repo is public (Actions run again). At a wall (CI not
  running, billing, a missing secret or account, a decision only the owner can make): stop the work that depends on
  it, send a push notification, report, wait; the same failure twice is a wall; no stacking work that can't merge, one
  review round per PR; an unattended run needs a goal and a budget (global `~/.claude/CLAUDE.md`).
- 2026-10-21 (later): "Lets remove release logic for now. We are under development. There is no even working MVP
  version." No releases, versions or changesets until the MVP works; they come back before the first launch (P2 step 7).
- 2026-10-21 (later): the owner had web-b2 fix and merge every open PR; the backend stack merged in order the same day.
- 2026-10-21 (later): Ýeral's support line is the owner's phone and Telegram until it has its own; deploy main to the
  server by hand (done the same day); "delete everything unnecessary" (left to the owner: Waiting on the owner).

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

2026-10-21: [0026](../decisions/0026-team-accounts-password-and-totp.md) the Ýeral team's own accounts, a password and
an authenticator code, never a phone (#122) · [0009](../decisions/0009-versioning-changesets.md) amended: releases
paused until the MVP works (#133). The day's "how" rows are 21.10.2026 rows in the book's chapter 9 marked "Claude
(delegated)": photos, the timed notices, the floor, the admin tool's sign-in, businesses, reviews, closing and adding,
the first launch, the SMS limits (with a concern on Q-299, the owner's "no cap"), and slice 1's (#105, #131).

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

1. **P4 slice 2, business setup** (the wizard, profile, services, hours, team, booking rules, link and QR; book
   chapter 10): its endpoints are merged (the setup draft #112, photos #116, the floor #120, step 4's settings). Also
   wire the photo upload #116 brought into My account (`ProfilePhoto`'s `upload` and `src`: `PUT /v1/me/photo`,
   `me.photo`).
2. **The frontend's backend gaps** (from web-b2, small PRs): the unfinished-setup card's category and steps done
   beside `{slug, name, step}` (Q-200); per workspace in `GET /v1/me/workspaces` the business's status (for banners),
   the person's specialization and the unanswered reviews count; for leaving a workspace, the person's bookings and
   requests ahead there; for deleting an account, the upcoming bookings it would cancel; `POST /auth/code`: its own
   error code for a number that isn't a mobile; the comment on `mobileInputSchema` still names 61–65, 71.
3. **Deploy by hand when the owner asks** (no release: #133; `infra/server/README.md` for the api, `deploy.yml` for
   legacy). The first admin account isn't made yet: `docker compose -f /srv/yeral/compose.yml run --rm api node
   dist/cli.js admin-invite <login> "<name>"` when the admin tool needs one.
4. **P2 left:** step 6's demo workspace (F-242: a session kind that can't act as a client, a nightly reseed of one
   workspace, demo numbers that can't be real people's); step 7: deploys from GitHub, nightly backups to R2 with a
   restore drill (the `media` volume and `.env` too), error tracking and uptime alerts (they watch `job gave up`,
   `business SMS limit reached`, `admin codes guessed…`, `admin secret sealed under another ADMIN_SECRET_KEY`), the
   code-SMS cap; step 4: the business logo, the map address search (F-014, needs a geocoder choice).

**Waiting on the owner:** the cleanup the owner asked for ("delete everything unnecessary"), left to the owner by
hand since the agents' permission checks block it (`log/2026-10-21-support-line.md`): the 42 merged branches on
GitHub, the 80 local branches, the unused Hyperdrive config `yeral-production` and the Neon project "Yeral", the
untracked `.neon` and `apps/api/dist-worker/` in the main checkout, and the repo setting "Allow GitHub Actions to create
and approve pull requests" (unused since #133); the concern on Q-299 (an SMS safety limit that never drops an SMS,
against "no cap"); the 20–21.10.2026 "Claude (delegated)" rows in chapter 9; Q-036's concern stands (with the code on
the screen anyone who types a real member's number signs in as them); later an R2 token, accounts for error tracking
and uptime checks, the DNS records when going public. Earlier: the main checkout needs
`git checkout -- docs/design && git clean -fd docs/design && git pull`.

**Server:** `ssh yeral-vps` (the owner allowed `Bash(ssh yeral-vps:*)`); deploy by hand with `infra/server/README.md` →
"Deploying Ýeral by hand". Since 2026-10-21 it runs main at a2e0418 (api image `yeral-api:a2e04184e1e3`, deployed by
web-b2): migrations 0000–0038 applied, the 6 cities and 13 categories, no businesses; `ADMIN_SECRET_KEY` in
`/srv/yeral/.env`, no admin account yet; `EXAMPLE_BUSINESSES` and `SIGN_IN_CODE_ON_SCREEN` off (the examples can go on
whenever the first launch opens); the edge Caddyfile with the token log filter. Kept from the deploy: the database
before it (`/srv/yeral/backup-2026-10-21-before-a2e0418.sql.gz`) and the old edge config
(`/srv/edge/Caddyfile.before-2026-10-21`). Firewall SSH/80/443, fail2ban, keys only; not public yet (no DNS record),
no backups to R2, and the `deploy` user has no key yet (P2 step 7).
