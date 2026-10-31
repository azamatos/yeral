# Active context

_Last updated: 2026-10-31_ · the current state only; the history by day is in `progress.md` → "Done".

## Current focus

**2026-10-31: hygiene done, slice 3 all but closed, slice 4 planned; four pieces parked as drafts.** 30.10–31.10 merged
#251–#262 (progress.md): activeContext trimmed; the support contacts out of the repo into the server's `.env`
(`YERAL_SUPPORT_PHONE|TELEGRAM|EMAIL`, `hello@yeral.app` the third way); HSTS and a per-site CSP (the client site's
with a per-request nonce; #253); slice 3's «How was it?» card, «You rated», the review's refusal, move mode on the
api's own-items reads with the rules and «Add to calendar», the tabs' counts, a move losing a service refused; Playwright
in CI with the first two flows (`pnpm e2e`, #258); the slice 4 plan (`log/2026-10-31-slice-4-plan.md`, #259); ADR 0014
amended: one agent at a time (#261). **Not deployed yet:** the server runs 74fae7d; #253 and #255 take effect only
with a deploy, which first needs the three support lines in `/srv/yeral/.env` (Next steps 1). Parked as draft PRs
when the weekly limit cut the agents off (**#263** e2e flows, **#264** slice 4's api gaps A1, **#265** U1, **#266** U2):
a fresh agent takes each over, one at a time. `main` was red 31.10 for a date-dependent story (fixed in #262).

Where things stand: M0–M2 released as tags (#20, 16.10); releases paused until the MVP works (ADR 0009 amended, #133),
production goes by hand with the owner's go. The api, the business app and the client site run on the own server
(ADR 0024; `api.yeral.app` since 22.10, `business.yeral.app` and `yeral.app` since 25.10, `noindex` until the launch).
P2: steps 0–6 done; step 7 keeps releases and deploys from GitHub and the code-SMS cap (backups and error tracking
moved to P6, owner 22.10). P4: slices 1 and 2 done; slice 3 built, closed but for Next steps 2; slice 4 planned, its
first PRs parked; slices 5–7 ahead (book chapter 10). The design redraw stopped (ADR 0021 amended 20.10): the apps are
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
- 31.10: one agent at a time, two at most, one on battery; no worktree per agent (ADR 0014 amended, AGENTS.md).
  `gh pr merge` is allowed in `.claude/settings.json`: a reviewed PR on green CI merges without a prompt. Slice 4's
  three decisions (browser notifications: three events, in front and in the background, no web push; the installable
  app: manifest, icons and a small offline-page service worker; no dragging in slice 4) were put to the owner on 31.10
  with the recommended option; no answer yet — they stand as "Claude (delegated)" until the owner says otherwise.

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

1. **Deploy (owner's go):** add to `/srv/yeral/.env` (mode 600) `YERAL_SUPPORT_PHONE`, `YERAL_SUPPORT_TELEGRAM`,
   `YERAL_SUPPORT_EMAIL=hello@yeral.app` (the phone and handle are the owner's; `deploy.sh` refuses without them),
   then `infra/server/README.md` → "Deploying Ýeral by hand" (a backup first) and its post-deploy checklist for the
   CSP (both sites with the console open, the maps, photos, the QR, the events stream; `curl -sI` for the headers;
   rollback: `sites-yeral.caddy.before-latest` + `caddy reload`). Until then the live sites keep the old contacts.
2. **Close P4 slice 3:** finish draft **#263** (expiry with offers, cancel + Undo, a move, the review, 390 px: the
   env-gated api test hook must stay off in production); the live click test with skill `qa-flows` after the deploy;
   two bugs #258 found: a click on the SSR'd client site before React hydrates is lost, and a request block on the day
   grid can sit under a neighbour's; home's «How was it?» card comes with slice 5 (then the write-review steiger
   override goes); an axe `label-content-name-mismatch` on «Call» links under Russian length was fixed in #260.
   `make-example <slug>` (#233, deployed) opens one of the owner's test businesses once the owner names it.
3. **Slice 4, daily work** (`log/2026-10-31-slice-4-plan.md`: 16 PRs in three lanes, five api gaps, the owner's three
   decisions above): finish the drafts **#264** (A1), **#265** (U1), **#266** (U2) one at a time, then B1–B13 in the
   plan's order (B4 move mode, B12 notifications and B13 the installable app follow the three decisions). Then slice
   5; then slices 6 + 7, then the first launch (P5), approved in advance (22.10): `EXAMPLE_BUSINESSES` and
   `DEMO_WORKSPACE` on, the cms site joins `yeral.caddy` with its app. The api's `/docs` page needs Scalar's bundle
   inventoried or self-hosted before its CSP tightens; the cms site gets a policy when its app joins.
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

**Waiting on the owner:** the go for the deploy (Next steps 1); the `make-example` slug (which test business opens to clients); an objection, if any, to slice 4's three decisions. Branch protection on `main`
when the demo app is done (27.10). The admin account once the admin tool (slice 6) is deployed, nothing secret
through the chat: Claude runs `docker compose -f /srv/yeral/compose.yml run --rm api node dist/cli.js admin-invite
<login> "<name>"` (login 3–32 of a-z 0-9 . -) and the owner opens the setup link (24 hours,
`cms.<domain>/setup/<token>`), picks the password, adds the authenticator app and keeps the 10 recovery codes. The old
Cloudflare Pages project `yeral-proto` (yeral.azamatos.com, an early Ýeral prototype) stays until all the web apps are
live, then goes (21.10); the owner's other Pages projects aren't Ýeral's and stay. Later (P6): an R2 token, accounts
for error tracking and uptime checks.

**Server:** `ssh yeral-vps` (the owner allowed `Bash(ssh yeral-vps:*)`; a production deploy needs the owner's go each
time: the permission check refuses one Claude starts on its own); deploy by hand with `infra/server/README.md` →
"Deploying Ýeral by hand" (`deploy.sh` saves the database first; the backups and config copies kept on the server are
in `progress.md`'s deploy entries 23.10–26.10, every backup mode 600). Since 2026-10-26 11:20 UTC it runs main at
74fae7d (main is far ahead: #251–#262 wait for the next deploy) (images `yeral-api`, `yeral-business`, `yeral-client` at `74fae7d0837a75bb`): migrations 0000–0044, the 6
cities, the category catalogue with its starter services, the 11 example businesses, the owner's test businesses;
`ADMIN_SECRET_KEY` in `/srv/yeral/.env`, no admin account yet; `SIGN_IN_CODE_ON_SCREEN` and `EXAMPLE_BUSINESSES` on
(owner, 25.10), `DEMO_WORKSPACE` off (on at the first launch). Public through the edge Caddy (`yeral.caddy` in
`/srv/edge/sites/`): `api.yeral.app`, `business.yeral.app`, `yeral.app` (`noindex`), `www` → the apex, Let's Encrypt
certificates; `cms.` resolves and fails TLS until its app joins. Firewall SSH/80/443, fail2ban, keys only; no backups
off the disk (P6); the `deploy` user has no key yet (P2 step 7).
