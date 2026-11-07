# Active context

_Last updated: 2026-11-07_ · the current state only; the history by day is in `progress.md` → "Done".

## Current focus

**2026-11-06/07: the owner's review of the live platform (51 problems, 4 ideas) and design round 7.** Plan:
`log/2026-11-06-owner-review-plan.md`; the design request `docs/design-requests/2026-11-06-round-7.md`; the owner's
export v0.7 (rounds 7.1 foundations, 7.2 business, 7.3 client: complete) is in `docs/design/` (#305). Agents were
allowed again for this run (owner 06.11: two at a time, xhigh; Opus 5.5 since 07.11). Merged and live (deploys
a908fa5, 7584ebe, then the next): #302 business fixes and the invite route · #303 the admin tool's superadmin/admin
roles and two-step sign-in (ADR 0026, Q-011) · #304/#308 sign-in codes through our Telegram bot @yeral_app_bot
(ADR 0029; `SIGN_IN_CODE_ON_SCREEN=false` on the server, so verifying businesses works) · #306 client fixes · #307
clients sort and counts · #305 tokens and Geist · #309 figures and phone format · #310/#312 our own Select, MultiSelect,
TimeField everywhere · #311 the business reviews page · #313 control sizes, tertiary/danger-quiet buttons, focus rings ·
#314 the home search bar · #315 hours editors · #317 calendar toolbar and week · #318 booking drawer and InfoTip · #319
team table and permissions matrix · #320 new-booking client search · #321 clients list and card · #322 booking steps.
**Open: #316** (no demo workspace anywhere) waits for the owner: deploying it needs the server's sandbox rows deleted
(`DELETE FROM businesses WHERE sandbox; DELETE FROM users WHERE demo;`, after a backup) or a filter kept. **Left from
round 7:** the FilterBar (A5) for bookings, client search and services; breadcrumbs (A7); callouts/toasts (A10); the
business page hero, tabs as panels and services at scale (C2, C3); C4's add-a-service sheet and phone summary; week
blocks clipping their time; the calendar's 390 sheets; ideas 1–3 (D). Each piece's log note (`log/2026-11-0[67]-*.md`)
lists what it left.

**Before (2026-11-01): P4 done, the first launch (P5) is live.** Slice 4 (#263–#286) is daily work;
slice 5 (#288 search, category pages and Home; #289 the results map; #290 location; #291 sitemap, robots, JSON-LD and
`discovery.spec.ts`) is discovery; slice 6 (#294, #295) is the admin tool, `apps/cms`; slice 7 (#298, #299) is the static and legal pages and «Try the business app». Live: main at 956e640,
`DEMO_WORKSPACE` on. **Next is the owner's review of the whole platform:** bugs and improvements wait for it (`finish-mvp-first`, owner 31.10). Each piece's log note (`log/2026-11-01-*.md`) lists what's there, its traps and what it left;
`log/2026-11-01-slice-4-live.md` says what a live check by Claude can't cover: Claude doesn't sign in or create accounts on
production, so the signed-in flows are proved on CI's stack and in the owner's review.

**Editing by script (01.11 lesson):** a Python edit script that asserts its anchors must write nothing until every anchor matched:
twice one failed partway, with Prettier having moved the text, and left some files changed. Collect the files first, write last.

**How to merge (31.10–01.11 lesson):** read a `success` conclusion for the CI run of the PR's exact head commit first. A
`gh run watch` of a run my next push cancelled once let #273 merge unverified, and a script's own last exit code hid it. After
a push, wait on that commit's run; don't reuse a run id from before it. Rebase on `main` and let CI run on the result when
something merged meanwhile. Only CI's Docker e2e runs at 1280×720: stories run wider and missed a popover off the screen.
**After a merge (owner, 01.11):** read `main`'s own run for the merged commit before deploying or starting anything; a green PR
run doesn't prove `main`, and a red run stops new work until it's understood and green. A run across Ashgabat's midnight (19:00 UTC)
fails the calendar's «tomorrow» stories, which read the day before the app does: run it again.

Where things stand: M0–M2 released as tags (#20, 16.10); releases paused until the MVP works (ADR 0009 amended, #133),
production goes by hand with the owner's go. The api, the business app and the client site run on the own server
(ADR 0024; `api.yeral.app` since 22.10, `business.yeral.app` and `yeral.app` since 25.10, `noindex` until real businesses join;
`cms.yeral.app` since 01.11).
P2: steps 0–6 done; step 7 keeps releases and deploys from GitHub (after the first launch, owner 01.11) and the code-SMS cap
(backups and error tracking moved to P6, owner 22.10). P4: all seven slices done and live, slice 3's remainder in Next steps 2. P5 live 01.11; P6 after investment (book chapter 10). The design redraw stopped (ADR 0021 amended 20.10): the apps are
built from the book and the drawn boards, components in Storybook first.

## Owner's direction

Rules still in force that live nowhere else (the rest are in `AGENTS.md`, the ADRs, `operations.md` and the book's
chapter 9; each day's quotes are in `progress.md`'s entry for that day, which is where the book's "Source:
activeContext" rows now point):

- Business decisions (21.10): the recommended option when it isn't critical; a critical one goes to the owner in the
  chat before the work starts, with its full description (no IDs to look up). Claude's decisions are "Claude
  (delegated)" rows in the book's chapter 9, with a concern where Claude disagrees; they stand unless the owner changes them.
- Walls (21.10): CI not running, billing, a missing secret or account, a decision only the owner can make → stop the
  work that depends on it, send a push notification, report, wait; the same failure twice is a wall; no stacking work
  that can't merge; one review round per PR; an unattended run needs a goal and a budget; don't heat the MacBook (23.10).
- Docker Desktop stays as it is (23.10): the api tests run in CI, not locally.
- Ýeral may be shown in the owner's portfolio, always as in development (27.10); the README's credit line stays.
- 30.10: `hello@yeral.app` works and is configured (the owner tested it); the order of work: hygiene → close slice 3
  with e2e → slice 4, 5 → slices 6 + 7, the first launch. Agents run on Fable at high effort (Claude Code specific).
- 01.11: no agents on this project, only the main session (ADR 0014 amended, AGENTS.md). PR merges are Claude's own.
- 01.11: the owner took the recommended option on everything open: chapter 9's four rows of that day (slice 4's three choices
  stand, who the legal pages name, no search engines through the demo, the first launch by hand).
- 31.10: Ýeral takes at most 30 % of the week; deploys and SSH are Claude's own, at each slice's end. Finish the plan
  to a working MVP with demo settings, take the recommended option, ask nothing small; the owner reviews the whole
  platform afterwards. `gh pr merge` is allowed in `.claude/settings.json`: a reviewed PR on green CI merges without a prompt. Slice 4's
  three decisions (browser notifications: three events, in front and in the background, no web push; the installable
  app: manifest, icons and a small offline-page service worker; no dragging in slice 4) were put to the owner on 31.10
  with the recommended option; the owner confirmed them on 01.11.

## Decisions

The ADRs in `docs/decisions/` (its `README.md` links them); the day each was taken is a `progress.md` entry.

| ADR | Decision | Taken | Amended |
|---|---|---|---|
| 0001 | pnpm + Turborepo | 2026-10-13 | |
| 0002 | Vite + TanStack instead of Next.js | 2026-10-13 | |
| 0003 | four sites on subdomains | 2026-10-13 | superseded by 0015 |
| 0004 | Feature-Sliced Design | 2026-10-13 | |
| 0005 | TypeScript backend in the monorepo (Hono + Postgres/Drizzle) | 2026-10-13 | |
| 0006 | zod contract + Hono RPC + OpenAPI | 2026-10-13 | |
| 0007 | Cloudflare now, Docker + nginx later | 2026-10-13 | 0024 supersedes it for the api and the sites |
| 0008 | i18n with use-intl | 2026-10-13 | |
| 0009 | versioning with Changesets | 2026-10-13 | 21.10: releases paused until the MVP works (#133) |
| 0010 | CI/CD on GitHub Actions | 2026-10-13 | |
| 0011 | state ownership | 2026-10-13 | 25.10: forms are plain state, a library before our own (#196) |
| 0012 | design system + Storybook | 2026-10-13 | 14.10: tokens v0.3.1 + Onest; 16.10: `COMPONENTS.md`, boards win |
| 0013 | testing strategy | 2026-10-13 | 31.10: e2e in `e2e/`, Chromium only, every PR on the Docker stack (#258) |
| 0014 | parallel agents | 2026-10-13 | 26.10: the weekly token budget, drop a full agent (#247); 31.10: one agent at a time, no worktree per agent (#261) |
| 0015 | the marketplace on the apex (yeral.app) | 2026-10-14 | |
| 0016 | TK default + RU + EN, prefixed URLs | 2026-10-14 | superseded by 0022 |
| 0017 | one booking engine, four types, five statuses | 2026-10-14 | 14.10: the business design's rules; 20.10: complaints |
| 0018 | the business workspace model | 2026-10-14 | |
| 0019 | own phone-code login and database sessions | 2026-10-14 | 21.10: the demo workspace's own cookie (#145) |
| 0020 | local and production only, no staging | 2026-10-16 | |
| 0021 | product book first, then design, Storybook, code | 2026-10-17 | 19.10: backend alongside; 20.10: small iterations, then build from the book |
| 0022 | built in English, each market adds its languages | 2026-10-18 | |
| 0023 | one code base, one deployment per market | 2026-10-18 | 19.10: first launch on the own server; 21.10: `verify_unavailable` (#138) |
| 0024 | the own server runs every app (Docker + Caddy) | 2026-10-19 | |
| 0025 | fixed levels, team rows, invites | 2026-10-19 | |
| 0026 | the Ýeral team's accounts: password + authenticator | 2026-10-21 | |
| 0027 | the address search behind a geocoder port (Photon) | 2026-10-21 | merged 23.10 (#153) |
| 0028 | the push channel: SSE nudged by Postgres NOTIFY | 2026-10-25 | |

Without an ADR, in the book's chapter 9: backups and error tracking with the real working MVP, the first launch
approved in advance (22.10); `hello@yeral.app` received through Cloudflare Email Routing, nothing sent (23.10); the
business app live with the code on the screen (25.10).

## Open questions

Product questions live in `docs/product/questions.md`, one ID each (ADR 0021; `pnpm book open` lists what's open);
the book has had none open since 21.10. Where the pre-book questions (old numbers 1–18) went: `progress.md`, 2026-10-17.

## Next steps

1. **Deploys:** at each slice's end, `infra/server/README.md` → "Deploying Ýeral by hand" (a backup first) with
   `git archive origin/main`. The support lines are in `/srv/yeral/.env` since 31.10.
2. **Slice 3's remainder:** two bugs #258 found: a click on the
   SSR'd client site before React hydrates is lost, and a request block on the day grid can sit under a neighbour's; home's
   «How was it?» card comes with slice 5 (then the write-review steiger override goes). `make-example <slug>` (#233, deployed)
   opens one of the owner's test businesses once the owner names it.
3. **Left after the first launch:** the api's `/docs` page needs Scalar's bundle inventoried
   or self-hosted before its CSP tightens; the business landing page (B-Landing); the ExampleBadge beside the demo workspace's name. Left from slice 4: «Frequent clients»
   on the new booking's name search (needs a list sorted by visits), the phone bookings list's filters, the clients list's chip
   counts, the card's Visits total and History count (the api sends neither), Report and Cancel on the bookings row menu, Undo
   when a report is removed on the card, the owner's click test including the install on a real phone. Left from slice 5: the
   phone's full-screen search sheet (Mobile 1), suggestions in «What?», the empty state's rows for tomorrow, grouping pins on one
   spot; The site stays `noindex` at the edge
   until real businesses join (owner, 01.11).
4. **Slice 2's follow-ups** (`log/2026-10-2[345]-*.md`): a category changed after the menu was saved keeps that menu;
   a lighter public categories list; one shared rule for which special day applies (app and api); a shared fake api
   for the Settings stories; leaving a section with unsaved changes asks nothing; specialization saves one language
   for all (fix before Turkmen and Russian); the business app's own pills onto `Pill`/`TimerPill`; the night before's
   shift past midnight in the calendar view (api); the photo upload in My account; the Demo frame and «Try the
   business app» (`sdk.demo.start()`); the leave and delete confirms' counts (#142); the page-state banner (#144).
5. **P2 left:** step 7's releases and deploys from GitHub (the `deploy` user's key too), and the code-SMS cap.
   Follow-ups: `/v1/health` comparing the database's newest migration with the image's; the jobs runner's `reviewAsk`
   drop branch, dead after the deploy with 0041; checking the settings permission before an upload's body is read;
   the invite-accept route reading every workspace.
6. **From the 27.10 review, later:** split the longest files as they're next touched; branch protection on `main`
   when the demo app is done; backups off the server's disk (P6). Done 30–31.10: this file trimmed, the support line
   out of the repo, HSTS + CSP.
7. **P6, with the real working MVP (owner 22.10):** backups to R2 with a restore drill (the `media` volume and `.env`
   too), error tracking and uptime alerts (they watch `job gave up`, `business SMS limit reached`, `admin codes
   guessed…`, `admin secret sealed under another ADMIN_SECRET_KEY`).

**Waiting on the owner:** the `make-example` page address (which test business opens to clients). The admin account, nothing secret
through the chat: the owner runs `docker compose -f /srv/yeral/compose.yml run --rm api node dist/cli.js admin-invite
<login> "<name>"` over SSH (login 3–32 of a-z 0-9 . -; the permission check refused it for Claude on 01.11), opens the setup link (24 hours,
`cms.<domain>/setup/<token>`), picks the password, adds the authenticator app and keeps the 10 recovery codes. The old
Cloudflare Pages project `yeral-proto` (yeral.azamatos.com, an early Ýeral prototype) stays until all the web apps are
live, then goes (approved 01.11): Cloudflare refuses until its custom domain `yeral.azamatos.com` is removed, which wrangler can't do, so that and the
CNAME are the owner's in the dashboard; delete the project after. The owner's other Pages projects aren't Ýeral's and stay. Branch protection on
`main` is on since 01.11: a PR on a branch up to date with `main`, CI's two jobs green, no force push. Later (P6): an R2 token, accounts
for error tracking and uptime checks.

**Server:** `ssh yeral-vps` (Claude's own since 31.10: deploy and SSH need no go); deploy by hand with `infra/server/README.md` →
"Deploying Ýeral by hand" (`deploy.sh` saves the database first; the backups and config copies kept on the server are
in `progress.md`'s deploy entries 23.10–26.10, every backup mode 600). Since 2026-11-01 it runs main at
956e640: migrations 0000–0044 and later, the 6
cities, the category catalogue with its starter services, the 11 example businesses, the owner's test businesses;
`ADMIN_SECRET_KEY` in `/srv/yeral/.env`, no admin account yet; `SIGN_IN_CODE_ON_SCREEN` and `EXAMPLE_BUSINESSES` on
(owner, 25.10), `DEMO_WORKSPACE` on (first launch, 01.11). Public through the edge Caddy (`yeral.caddy` in
`/srv/edge/sites/`): `api.yeral.app`, `business.yeral.app`, `yeral.app` (`noindex`), `cms.yeral.app` (`noindex`), `www` → the apex, Let's Encrypt
certificates. Firewall SSH/80/443, fail2ban, keys only; no backups
off the disk (P6); the `deploy` user has no key yet (P2 step 7).
