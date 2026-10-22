# Active context

_Last updated: 2026-10-23_

## Current focus

**2026-10-23: yeral.app moved to the own server.** The owner removed `yeral.app` and `www` from the old Worker
`yeral-web` and added the A records for `@`, `www`, `api`, `business` and `cms` (DNS only; 22.10). Claude deployed main
at 5c07be4 with `PUBLIC=1` (22.10 21:18 UTC, a database backup first): migrations 0039–0041 applied, Caddy got Let's
Encrypt certificates for `yeral.app`, `www` and `api`, `https://yeral.app` shows the coming-soon page (#150), `www`
redirects to it, `https://api.yeral.app/v1/health` answers. The old site left the repo (`apps/legacy`, its deploy option
and smoke check, its ignore entries; this PR).

**2026-10-22: the backend is all but done for the first launch; the owner answered what it still asked for.** The
evening of 21.10 merged #137–#147 (each reviewed with `code-review`, one round, on green CI): six concerns settled with
the recommended option (#137); no business verified while the sign-in code shows on the screen (#138, ADR 0023
amended); the sign-in screens ask `GET /v1/auth/mode` before a number is typed (#139); the business logo (#140,
migration 0039); the "Continue setting up" card's data (#141); what the leave and delete confirms touch (#142); the
business app's demo workspace, made again every night (#143, migration 0040), and a day in it for any visitor (#145,
ADR 0019 amended: demo sessions in a cookie of their own); the switcher's page state, specialization and reviews to
answer (#144); the demo note on both sign-ins (#146); two unused columns dropped (#147, migration 0041, a contract
migration: no rollback to an older image past it). On 22.10 the owner answered (Owner's direction): no backups and no
error tracking for the demo launch, both with the real working MVP (P6); the first launch approved in advance; the DNS
records for `api`, `business` and `cms` now (`infra/server/README.md`, "DNS records").

Open: **#148** the "How was it?" card's api (F-243, migration 0042): green, but in conflict since #147 merged under
it; it needs a rebase and its review. **`feat/api-address-search`** (`39259e4`): the address search behind the map pin
through a geocoder port (Photon over OpenStreetMap, ADR 0027 in the branch), pushed without a PR or review.

Where things stand: M0–M2 are merged and released as tags (#20, 2026-10-16). Releases are paused until the MVP works
(#133, ADR 0009 amended; the `release` skill is now `ship`): no versions or changesets, and production goes by hand.
The api and Postgres run on the owner's server since 2026-10-19, public at `api.yeral.app` since 2026-10-23 (main at
5c07be4); yeral.app shows a coming-soon page from the server until the client site takes it over. P2: steps 0–6 done (step 4
but the map address search, in the open branch); step 7 has the SMS limits and the sitemap data, and keeps releases
and deploys from GitHub (backups and error tracking moved to P6, owner 22.10). P4: slice 1 done, slice 2 (business
setup) next. The design redraw stopped (ADR 0021 amended 2026-10-20): the apps are built from the book and the drawn
boards, and Claude Design is used only for a critical undrawn detail. The frontend (web-b2) builds slice by slice:
components in Storybook, then the apps.

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
- 2026-10-21 (later): "delete everything we don't need anymore"; keep `yeral-proto` until all the web apps are live.
  Business decisions: the recommended option when it isn't critical; a critical one goes to the owner in the chat
  before the work starts, with its full description (no IDs to look up).
- 2026-10-21 (later), on the code on the screen (Q-036): "Go with option B …, its demo version still. When we launch in
  TKM we will add real phone number code protection." No real businesses at the first launch.
- 2026-10-22: "Backups are not necessary for now. We can add it later on real working MVP. Error tracking is also
  not favorite for demo one." Both come with the real working MVP, before any real business's data (P6); uptime alerts
  wait with them (Claude's concern: nobody hears that the demo is down; a free uptime check could come back alone).
  Until then the api's alert lines stay in its Docker logs, read at each deploy. "I approve launch": the first launch
  is approved in advance and goes out once the apps are built and checked locally. The owner adds the DNS records
  (`infra/server/README.md`, "DNS records"). For the admin account nothing secret goes through the chat.
- 2026-10-22 (later): "i dont think we need current working yeral.app, lets make dns for it too". The old site is
  retired now: `yeral.app` and `www` point at the server with the other records, and the apex shows a coming-soon page
  (`infra/server/yeral/yeral.caddy`) until the client site takes it over. After the switch the owner deletes the
  Worker `yeral-web` and a PR removes `apps/legacy` (done 23.10.2026).
- 2026-10-23: "Lets go back to email settings later. FOr now lest go with deploy and other tasks." The e-mail records
  wait (lock down, or receive mail at an address through Email Routing); deployed the same night.

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
the first launch, the SMS limits, and slice 1's (#105, #131); they stand (the owner, 21.10: the recommended option
unless critical). Six concerns settled the same way (chapter 9, 21.10.2026): Q-299 the SMS safety limit stays, Q-270
no password, Q-259 a "How was it?" card once per completed visit (F-243, no SMS), Q-105 flexible where businesses
differ with good defaults, Q-103 a price level later (F-244), Q-101 a native proofread before the Turkmenistan launch.
Q-036's concern was critical; the owner chose: no real businesses at the first launch, they come with the Turkmenistan
launch's real SMS sign-in; while the code shows on the screen the api verifies nothing (`verify_unavailable`; ADR
[0023](../decisions/0023-one-deployment-per-market.md) amended, #138). [0019](../decisions/0019-own-phone-login-and-sessions.md)
amended: the demo workspace's sessions in a cookie of their own (#145). The book has no open question left.

2026-10-22 (no ADR; the book's chapter 9, 22.10.2026): backups (F-211) and error tracking with uptime alerts (F-209)
with the real working MVP, not the demo launch (owner; Claude's concern on the uptime check); the first launch
approved in advance (owner); DNS for the own server (Claude, delegated).

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

1. **Finish the two open backend pieces:** rebase #148 on main (its migration stays 0042), review it, merge; open a PR
   for `feat/api-address-search`, review it, merge.
2. **P4 slice 2, business setup** (the wizard, profile, services, hours, team, booking rules, link and QR; book
   chapter 10): its endpoints are merged (the setup draft #112 and its card #141, photos #116, the logo #140, the floor
   #120, step 4's settings; the address search once merged). Also: the photo upload in My account (`ProfilePhoto`'s
   `upload` and `src`: `PUT /v1/me/photo`, `me.photo`); the Demo frame from `me.demo` (the signed-out sidebar with
   "Log in", the Demo banner, `demo` in the switcher), "Try the business app" (`sdk.demo.start()`) on the login and the
   wizard, and `demo_number`'s hint; the leave and delete confirms' counts (#142); the page-state banner (#144).
3. **Deploy by hand when the owner asks** (no release: #133; `infra/server/README.md`, a database backup first). The
   first launch (approved in advance, 22.10) goes when slices 2–7 are built and checked locally: the switches
   `SIGN_IN_CODE_ON_SCREEN`, `EXAMPLE_BUSINESSES`, `DEMO_WORKSPACE` on, the client site replaces the coming-soon page in
   `yeral.caddy` (no DNS change), and the business and cms sites join it with their apps.
4. **P2 left:** step 7's releases and deploys from GitHub, and the code-SMS cap. Follow-ups: `/v1/health` comparing
   the database's newest migration with the image's; the jobs runner's `reviewAsk` drop branch, dead after the deploy
   with 0041; checking the settings permission before an upload's body is read; the invite-accept route reading every
   workspace. With the real working MVP (P6, owner 22.10): backups to R2 with a restore drill (the `media` volume and
   `.env` too), error tracking and uptime alerts (they watch `job gave up`, `business SMS limit reached`, `admin codes
   guessed…`, `admin secret sealed under another ADMIN_SECRET_KEY`).

**Waiting on the owner:** deleting the Worker `yeral-web` in Cloudflare (the switch is confirmed, 23.10); the e-mail
records (`infra/server/README.md`, "DNS records": lock `yeral.app` down with SPF, DMARC and a null MX, or receive mail at
an address through Email Routing and add only DMARC). The admin account needs nothing secret: once the admin tool (slice 6) is deployed, Claude
runs `docker compose -f /srv/yeral/compose.yml run --rm api node dist/cli.js admin-invite <login> "<name>"` (login 3–32
of a-z 0-9 . -) and the owner opens the setup link (24 hours, `cms.<domain>/setup/<token>`), picks the password, adds
the authenticator app and keeps the 10 recovery codes. `docs/design/Claude outputs/yeral-design-v0.5.zip` (untracked,
in the main checkout) is the owner's to delete. The old Cloudflare Pages project `yeral-proto` (yeral.azamatos.com, an
early Ýeral prototype) stays until all the web apps are live, then goes (the owner, 21.10); the owner's other Pages
projects aren't Ýeral's and stay. Later (P6): an R2 token, accounts for error tracking and uptime checks.

**Server:** `ssh yeral-vps` (the owner allowed `Bash(ssh yeral-vps:*)`); deploy by hand with `infra/server/README.md` →
"Deploying Ýeral by hand". Since 2026-10-22 21:18 UTC (23.10 00:18 the owner's time) it runs main at 5c07be4 (api
image `yeral-api:5c07be492cf7`; before it 23a1c14 from 21.10, not a2e0418 as these notes said): migrations 0000–0041
applied, the 6 cities and 13 categories, no businesses; `ADMIN_SECRET_KEY` in `/srv/yeral/.env`, no admin account yet;
`EXAMPLE_BUSINESSES`, `SIGN_IN_CODE_ON_SCREEN` and `DEMO_WORKSPACE` off (on when the first launch opens). Public: the
edge Caddy serves `yeral.caddy` (`/srv/edge/sites/`): `api.yeral.app`, the coming-soon page on `yeral.app`, `www` → the
apex, with Let's Encrypt certificates; `business.` and `cms.` resolve to the server and fail TLS until their apps join.
Kept from the deploy: the database before it (`/srv/yeral/backup-2026-10-23-before-5c07be4.sql.gz`; every backup there
is mode 600) and the edge config (`/srv/edge/Caddyfile.before-2026-10-23`). Firewall SSH/80/443, fail2ban, keys only;
no backups to R2 (P6), and the `deploy` user has no key yet (P2 step 7).
