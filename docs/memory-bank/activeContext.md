# Active context

_Last updated: 2026-10-25_

## Current focus

**2026-10-25: the business app is live at `business.yeral.app`; slice 2's last pieces under way.** The owner wanted to
try the app on the real domain rather than locally (Owner's direction): #192 added the business app to the server
(`deploy.sh` builds its image, a `business` service, `business.yeral.app` in `yeral.caddy`) and turned the sign-in code
on the screen on (anyone who types a number signs in as it: test data only); deployed at 07952fd (08:42 UTC). That
deploy skipped its database backup (nothing lost; fixed in #193, `log/2026-10-25-business-live.md`). The owner tested
it, found six things and the done step's QR (fixed in #194, #195, #197, #199, #200) and set the rules "not
overcomplicating things" and "a library before our own" (ADR 0011 amended, AGENTS.md rule 10a, #196); deployed at
592cfd2 (10:45 UTC, a backup first). The owner gave the whole day: three agents finish slice 2 (Team's add #198 and its
drawer, the page address a business chooses: api #201 with migration 0043, then its screens; faster updates), each PR
reviewed with `code-review` on green CI, notes in `log/2026-10-25-*.md`. Settings was built the night before
(#174–#191, `log/2026-10-24-*.md`; progress.md), the wizard on 23.10 (#148–#173, `log/2026-10-23-*.md`). The apex
keeps the coming-soon page; the example businesses and the demo workspace stay off; the owner's e-mail for yeral.app
waits for another session (24.10).

**2026-10-23: yeral.app moved to the own server.** The owner removed `yeral.app` and `www` from the old Worker
`yeral-web` and added the A records for `@`, `www`, `api`, `business` and `cms` (DNS only; 22.10). Claude deployed main
at 5c07be4 with `PUBLIC=1` (22.10 21:18 UTC, a database backup first): migrations 0039–0041 applied, Caddy got Let's
Encrypt certificates for `yeral.app`, `www` and `api`, `https://yeral.app` shows the coming-soon page (#150), `www`
redirects to it, `https://api.yeral.app/v1/health` answers. The old site left the repo (`apps/legacy`, its deploy option
and smoke check, its ignore entries; #151).

Where things stand: M0–M2 are merged and released as tags (#20, 2026-10-16). Releases are paused until the MVP works
(#133, ADR 0009 amended; the `release` skill is now `ship`): no versions or changesets, and production goes by hand.
The api and Postgres run on the owner's server since 2026-10-19, public at `api.yeral.app` since 2026-10-22 21:18 UTC
(23.10 the owner's time; the server at 5c07be4, main ahead); yeral.app shows a coming-soon page from the server until
the client site takes it over. P2: steps 0–6 done (the map address search too, #153); step 7 has the SMS limits and the sitemap data, and keeps releases and deploys from GitHub
(backups and error tracking moved to P6, owner 22.10). P4: slice 1 done, slice 2 (business setup) under way: the
whole wizard and the login's "Continue setting up" card are built; Settings is next. The design redraw stopped (ADR 0021 amended 2026-10-20): the apps are built from the book and the drawn
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
  wait (lock down, or receive mail at an address through Email Routing); deployed the same night. (E-mail: replaced
  the next evening, below.)
- 2026-10-23 (night): "Lets go. U have 2 hours, do not hit the wall more than 3 times. And do not make the macbook
  heat, by using too much cpu/gpu and etc." Seven PRs merged, no wall (Current focus).
- 2026-10-23 (evening): the owner deleted the Worker `yeral-web` and the untracked `docs/design/Claude outputs/`;
  "can we set getting email for yeral?": receive mail at `hello@` through Cloudflare Email Routing, forwarded to the
  owner's inbox, with a DMARC record against mail sent in yeral.app's name; sending stays off (the owner sets it up,
  `infra/server/README.md`, "DNS records"). Docker Desktop stays as it is (so the api tests run in CI, not locally).
  "Lets continue on tasks, u have one more 2 hours": the rest of the wizard, #157–#173, no wall.
- 2026-10-24: "Go for 2 hours, email settings leave for other session. Focus on yeral." The run builds the Settings
  sections; the e-mail records wait. Extended by 2 hours the same night: Settings built but Team's add and drawer,
  #174–#191.
- 2026-10-25: "i dont wanna check locally, go live on our domains." Asked, the owner chose the business app only at
  `business.yeral.app` (the apex keeps the coming-soon page) with the sign-in code on the screen, open to anyone
  (test data only); the book's chapter 9, 25.10.2026.
- 2026-10-25 (after testing it live): six fixes asked (the disabled button, the toast, digits in selects, «Create a
  business» again for someone who has one, naming the own services' group, clearer service groups) and the done step's
  QR as clear as Settings'. "Go with recommendation. The main idea is not overcomplicating things. For example if we
  can use some library for date picker and etc. Lets use it, no need for making own one." (ADR 0011 amended: forms are
  plain state; AGENTS.md rule 10a.) A business chooses its own page address instead of `turkmen-barber-2` ("add it to
  the plan"); updates feel slow rather than instant (Next steps).
- 2026-10-25 (later): "U have whole day to work on this tasks, dont limit yourself" (a run until about 23:00 MSK).
  Asked about slice 3: the client site takes `yeral.app` now (noindex until the launch), the example businesses go on,
  and one of the owner's test businesses can be opened to clients with a server command (the book's chapter 9,
  25.10.2026; the plan: `log/2026-10-25-slice-3-plan.md`).

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

2026-10-25: [0011](../decisions/0011-state-management.md) amended: a form is the owning slice's hook with plain state,
no TanStack Form; a well-known library before our own component (AGENTS.md rule 10a). The business app live with the
code on the screen (no ADR; the book's chapter 9, 25.10.2026).

2026-10-23: [0027](../decisions/0027-geocoder-port.md) the address search behind a geocoder port (Photon over
OpenStreetMap, #153); e-mail (no ADR; the book's chapter 9, 23.10.2026): `hello@yeral.app` received through Cloudflare
Email Routing, nothing sent, DMARC reject (the owner; the details Claude's, delegated).

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

1. **P4 slice 2, business setup** (book chapter 10): the wizard (#154–#173) and Settings (#174–#191) are built and
   live, with the owner's fixes (#194–#200) and «Add a team member» (#198). Under way 25.10: Team's staff drawer
   (profile, services, hours and time off, remove and reactivate with AffectedBookingsList moved to `entities/booking`;
   its api first: name, specialization and phone edits, a person's services in one call, the app turned off, `cancel`
   on a schedule change); the page address a business chooses (#201's api; next its screens: the wizard's business
   step and «Change link»; the client site's page redirects from an old address in slice 3); faster updates
   (optimistic switches and saves, fewer repeated reads of `me`, the workspaces and the setup; the server answers in
   8 ms at p50, the 10-second events poll stays until slice 3's push channel). Then: the special days' dates through
   `react-day-picker` (rule 10a); "Left" vs "Removed" on Team (a migration: who ended a membership, when); Business
   profile's address as B-Settings draws it (#190 reuses the wizard's layout); a Russian-length check of slice 2's
   screens (P3). Follow-ups from the reviews (`log/2026-10-2[345]-*.md`): the step list's summaries for team and rules
   and lighter counts there; a category changed after the menu was saved keeps that menu; a lighter public categories
   list; the timer pill, pills and a special-day row in shared layers; one shared rule for which special day applies
   (app and api); a shared fake api for the Settings stories; leaving a section with unsaved changes asks nothing yet.
   Also: the photo upload in My account (`ProfilePhoto`'s `upload` and `src`: `PUT /v1/me/photo`, `me.photo`); the
   Demo frame from `me.demo` (the signed-out sidebar with "Log in", the Demo banner, `demo` in the switcher), "Try the
   business app" (`sdk.demo.start()`) on the login and the wizard, and `demo_number`'s hint; the leave and delete
   confirms' counts (#142); the page-state banner (#144).
1a. **P4 slice 3, the booking loop** (started 25.10; plan, lanes and owner's decisions in
   `log/2026-10-25-slice-3-plan.md`): shared ui pieces (U1–U3), the push channel for live updates (U5), My bookings'
   fields (U4), the client site on the apex (U6, this PR) and `make-example` (U7); the client lane (business page,
   booking steps, confirm, My bookings, the booking drawer, move, review) and the business lane (calendar day, its
   layers, the request drawer, decline with offered times, move requests).
2. **Deploy by hand when the owner asks** (no release: #133; `infra/server/README.md`, a database backup first; the
   business app ships with the api since 25.10). The first launch (approved in advance, 22.10) goes when slices 2–7
   are built and checked: `EXAMPLE_BUSINESSES` and `DEMO_WORKSPACE` on (the code on the screen is on already), the
   client site replaces the coming-soon page in `yeral.caddy` (no DNS change), and the cms site joins it with its app.
3. **P2 left:** step 7's releases and deploys from GitHub, and the code-SMS cap. Follow-ups: `/v1/health` comparing
   the database's newest migration with the image's; the jobs runner's `reviewAsk` drop branch, dead after the deploy
   with 0041; checking the settings permission before an upload's body is read; the invite-accept route reading every
   workspace. The server runs main at 592cfd2 (25.10). With the real working MVP (P6, owner 22.10): backups to R2 with a restore drill (the `media` volume and
   `.env` too), error tracking and uptime alerts (they watch `job gave up`, `business SMS limit reached`, `admin codes
   guessed…`, `admin secret sealed under another ADMIN_SECRET_KEY`).

**Waiting on the owner:** turning on Email Routing for `hello@yeral.app` and adding the `_dmarc` record
(`infra/server/README.md`, "DNS records"; Cloudflare's dashboard now names the path Compute → Email Service → Email
Routing); Claude checks the records afterwards, in another session (owner, 24.10). The admin account needs nothing secret: once the admin tool (slice 6) is deployed, Claude
runs `docker compose -f /srv/yeral/compose.yml run --rm api node dist/cli.js admin-invite <login> "<name>"` (login 3–32
of a-z 0-9 . -) and the owner opens the setup link (24 hours, `cms.<domain>/setup/<token>`), picks the password, adds
the authenticator app and keeps the 10 recovery codes. The old Cloudflare Pages project `yeral-proto` (yeral.azamatos.com, an
early Ýeral prototype) stays until all the web apps are live, then goes (the owner, 21.10); the owner's other Pages
projects aren't Ýeral's and stay. Later (P6): an R2 token, accounts for error tracking and uptime checks.

**Server:** `ssh yeral-vps` (the owner allowed `Bash(ssh yeral-vps:*)`); deploy by hand with `infra/server/README.md` →
"Deploying Ýeral by hand". Since 2026-10-25 10:45 UTC it runs main at 592cfd2 (images `yeral-api:592cfd20b8bb` and
`yeral-business:592cfd20b8bb`; before it 07952fd from 08:42 the same day, 5c07be4 from 22.10): migrations 0000–0042
applied, the 6 cities and the category catalogue with its starter services, the owner's test businesses; `ADMIN_SECRET_KEY` in `/srv/yeral/.env`, no
admin account yet; `SIGN_IN_CODE_ON_SCREEN` on (owner, 25.10), `EXAMPLE_BUSINESSES` and `DEMO_WORKSPACE` off (on when
the first launch opens). Public: the edge Caddy serves `yeral.caddy` (`/srv/edge/sites/`): `api.yeral.app`,
`business.yeral.app`, the coming-soon page on `yeral.app`, `www` → the apex, with Let's Encrypt certificates; `cms.`
resolves to the server and fails TLS until its app joins. Kept: the database before the 10:45 deploy
(`/srv/yeral/backup-2026-10-25-before-592cfd2.sql.gz`), right after the 08:42 one (`backup-2026-10-25-after-07952fd.sql.gz`;
the one before it was skipped) and before the 22.10 one
(`backup-2026-10-23-before-5c07be4.sql.gz`; every backup there is mode 600), the site file before 25.10
(`/srv/edge/sites-yeral.caddy.before-07952fd`) and the edge config (`/srv/edge/Caddyfile.before-2026-10-23`). Firewall SSH/80/443, fail2ban, keys only;
no backups to R2 (P6), and the `deploy` user has no key yet (P2 step 7).
