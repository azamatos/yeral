# Progress and roadmap

## Done

- **2026-10-13 · Phase 0 + 1 (Next.js):** client marketplace on mock data: home, search with map and day rail, salon pages
  with JSON-LD, full-page booking wizard, phone login, my bookings and booking detail (cancel, move, proposal,
  review, «это не я»), favourites, profile, notifications, demo panel playing the salon. Live at https://yeral.app
  (Cloudflare Worker `yeral-web`, www → apex). Commits `3906655`, `f536f22`.
- **2026-10-13 · Architecture agreed** in two rounds with the owner: monorepo, four sites + api + Storybook, TanStack,
  FSD, state ownership, TypeScript backend on Postgres from the start, design system in Storybook, testing strategy,
  Cloudflare now / Docker + nginx later, Changesets, GitHub Actions, parallel agents. ADRs 0001–0014, this memory bank,
  `AGENTS.md`, project skills. The owner's direction (13.10): infrastructure first; Cloudflare now, own server
  (Docker + nginx, Cloudflare for DNS) later; name and domain in config; the repo public until ready; a design system
  with Storybook and tests; 2–3 agents in parallel later.

- **2026-10-13 · M0 monorepo foundation** (PR #1, `76a218b`): pnpm 12 workspace with a dependency catalog and
  `allowBuilds`; Turborepo tasks (`build lint lint:fsd typecheck test dev deploy`); `@yeral/config` (tsconfig bases,
  ESLint 10 flat preset, Prettier with Tailwind class sorting, Vitest preset, with type declarations); `pnpm gen package`;
  lefthook (format staged files, commitlint); Changesets (private packages versioned and tagged); GitHub Actions `ci.yml`,
  `release.yml`, `deploy.yml` + `scripts/smoke.sh`; `/version.json` stamp; Renovate config; issue and PR templates;
  `PORT_BASE`; `AGENTS.md` for every agent tool. The Next app moved to `apps/legacy` (`@yeral/legacy`) and builds, previews
  and deploys from the monorepo. First tests: 45 Vitest cases for the booking rules, which found and fixed a bug (yearly
  closures across New Year were ignored). CI green on the first run. 2026-10-14: `CLOUDFLARE_API_TOKEN` secret set; version PR #2 merged → tags and GitHub
  Releases `@yeral/legacy@0.1.1`, `@yeral/config@0.0.1` → CI deployed yeral.app → smoke check green. Repo
  settings: labels (`lane:*`, `status:*`, `type:*`), Actions may open PRs, `main` protected.

- **2026-10-14 · Storybook branding**: Ýeral logo, colours, favicon and tab title; link-preview tags; kept out of search (`noindex` + `robots.txt`).
- **2026-10-14 · Neon** linked and verified: project Yeral in Frankfurt, Postgres 18, `neon.ts` in the repo, local env
  via `neon env pull`; driver decision updated to node-postgres via Hyperdrive (ADR 0005 revision).
- **2026-10-14 · M1 design system** (PR #6, released `@yeral/ui@0.1.0`, live at storybook.yeral.app): `@yeral/ui` from web DS v0.3.1 — theme
  (`styles/theme.css`, every `docs/design/tokens.css` value under a Tailwind name, default palette switched off, a
  96-case sync test), self-hosted Onest, `cn()`, brand assets + `Logo`, `UIProvider` (Lucide stroke 1.75), and
  components: Button (7 variants × 3 sizes, icon-only, loading), Field, Input, Textarea, PhoneInput (+993), Select,
  CodeInput (SMS), HeroSearch, CompactSearch, QueryBar, Chip, Tabs (+ link tabs), Segmented, Checkbox, Radio, Switch,
  OptionCard, StatusBadge, CountBadge, Avatar, Rating/Stars, Skeleton, EmptyState, Modal (400/480/560/640, sheet under
  768), Drawer (480, sheet), Popover, Menu, Tooltip, Toast (sonner), DateStrip, TimeSlots, Calendar, Stepper, NavLink,
  SideNav, LanguageSwitcher, Breadcrumbs, Pagination, Table primitives + BulkBar. `apps/storybook` (Storybook 10) with
  Introduction and Foundations pages; 79 stories run as Vitest browser tests in Chromium with axe (accessibility
  violations fail). `pnpm gen ui-component`. CI installs Chromium; Storybook deploys to storybook.yeral.app from `main`.
- **2026-10-14 · Web design v0.3 received** (`docs/design/`): client site fully designed (15 screens, spec, tokens, demo
  data, photos). It widens the product to any business that sells time, three booking types, TK/RU/EN, marketplace on
  the apex; recorded in ADRs 0015–0017 and the memory bank. The old mobile designs were removed (owner: the web has its
  own design and logic). The first client app (`apps/legacy`) is replaced by the new design in M3, not polished.

- **2026-10-14 · Business workspace design received and reviewed** (`docs/design/business/` + `screens/business/B-*`,
  round 4: shell, calendar, bookings, clients, client card, setup wizard, settings, services, team and roles; appointment
  type only). Findings: it reverses "manual only" (instant confirmation + hold time are business settings), adds booking
  rules, decline reasons with alternatives, complaints instead of a "came" button, walk-in bookings, per-business roles
  with field-level redaction, a CRM per business, branches and verification. Recorded in ADR 0017 (revised) and ADR 0018;
  client-side gaps logged as open questions 11–12. Its data matches the client demo (Glow Studio, services s1–s11, staff).
  The owner's direction (14.10): follow the design's site map (the marketplace on yeral.app, no landing app); remove
  the old mobile designs entirely ("we have a new design and our own logic"); maps = MapLibre + OpenFreeMap. Round 4
  ("decided 14.10.2026"): manual confirmation is the default, a business may switch on instant confirmation; requests
  expire after the business's hold time (default 30 min) with 3 alternative times, replacing the morning's "every
  booking by hand, no instant setting". Decisions of the day: ADR 0015 the marketplace on the apex (supersedes 0003);
  ADR 0016 TK default + RU + EN, prefixed URLs; ADR 0017 one booking engine, four types, five statuses, always
  confirmed by hand, revised the same day by the business design (confirm modes, hold time, booking rules, decline with
  alternatives, complaints, source `web|app|phone|walkin|ai`); ADR 0018 the business workspace model (our own staff,
  memberships, per-business roles and client records; a branch is its own business; only verified businesses are
  public); ADR 0019 (in PR #16) own phone-code login and database sessions instead of Better Auth (the design's
  attempts/lock/resend rules, no placeholder e-mails, endpoints in the contract); ADR 0012 revised to tokens v0.3.1 +
  self-hosted Onest.

- **2026-10-14 · M2a `@yeral/domain`**: the booking engine as pure TypeScript with subpath exports (`time`, `model`,
  `rules`, `hours`, `availability`, `lifecycle`, `permissions`, `clients`, `pricing`, `geo`, `phone`, `id`), following
  ADR 0017/0018 and the business design: confirm modes and hold time, booking rules with their option lists, special days
  with special hours, staff shifts and per-day breaks, service chains with «Islendik hünärmen» split, buffers (per-service
  override) that must fit hours, slot step, staff bookings without lead/window, plan checks for drag-to-move, tables
  (smallest free table, VIP minimum), classes (seats, max 2), permissions with "Bes" visibility, client stats and
  segments, no-show block. 112 Vitest cases, the legacy rule cases carried over.

- **2026-10-14 · M2b `@yeral/lib` + `@yeral/i18n`**: `lib/site` (hosts per environment from `YERAL_ENV`,
  `YERAL_DOMAIN`, `PORT_BASE`; cookie domain and prefix; origins; demo flag) and `lib/env` (`parseEnv`); `@yeral/i18n` with
  shared `common`/`status`/`fmt` messages in tk/ru/en (key parity tested) and hand-written formatters (`createFmt`,
  `useFmt`) that print the design's formats on server and browser alike (`1 410 TMT`, `250 TMT-den`, `1 sag 30 min`,
  `1,2 km`, `Penşenbe, 15 oktýabr`, `14 okt.`). `zod` and `use-intl` added to the catalog.

- **2026-10-14 · M2c `@yeral/contract`**: zod 4 schemas for every client screen (`common`, `errors`, `catalog`,
  `availability`, `bookings`, `account`, `events`), named for OpenAPI with `.meta({ id })`; error codes with their HTTP
  status and messages in tk/ru/en (`@yeral/i18n` `errors` namespace; a test fails when a code has no message);
  `docs/API.md` rewritten as the endpoint map.

- **2026-10-14 · M2d `apps/api` foundation**: Hono + zod OpenAPI app factory (request id, CORS for our sites, origin check
  on mutations, error mapper with contract codes, `/v1/health`, `/version.json`, `/openapi.json`, Scalar `/docs`), config
  from env, Node entry (+ demo photos at `/media/demo`), esbuild bundle with migrations. Drizzle schema for the client and
  business model (ADR 0017/0018/0019: users, login codes, sessions, rate limits, categories, businesses, rules, staff,
  roles, memberships, services, tables, class sessions, clients, notes, favourites, places, bookings, items, reviews,
  events, jobs) with exclusion constraints against double booking (btree_gist). Demo seed from both design files, dates
  moved to today; Glow Studio's client list reproduces the design's visits and no-shows. `pnpm db:up/db:setup/db:generate`,
  API tests on per-file Postgres copies, Postgres service in CI. ADR 0019: own phone login and sessions instead of Better Auth.

- **2026-10-14 · M2e api endpoints for every client screen** (30 paths in the OpenAPI document): phone login
  (`/v1/auth/code|verify|logout`: 4 digits, 5 min, resend 59 s, attempts left, 3 tries → 60 s lock, rate limits per
  phone and IP, demo code 1234; a login links invitations, client rows and phone bookings with that number), sessions
  (hashed token cookie, 60 days sliding, bearer for apps), `/v1/me` (profile, language, SMS switches, phone change,
  deletion), favourites, categories, search (radius or map area, category/type/rating/price/open-now/women-only, "has free
  time" on the day or week, nearest first or rating × reviews, cursor paging), suggestions, places, business page,
  reviews, free times (appointment with the 14-day strip and next free day, per-specialist next free, tables, class
  sessions), bookings (send all three types with domain checks + exclusion constraints → `409 slot_taken` with 3 nearest
  times; list upcoming/past; detail with timeline, hold, cancel deadline, decline/expiry alternatives, pending move,
  actions; cancel + "Yzyna al" for 5 min; note; move = new request (instant businesses move at once); take an offered
  time; reviews with the business rating kept up to date), events polling, and `runDueJobs()` (expire requests at their
  hold time with 3 alternatives + SMS, complete finished visits, SMS queue with reminders and review asks honouring the
  person's switches, demo businesses without a team answer by themselves). SMS texts and decline reasons live in
  `@yeral/i18n` (`sms`, `declineReasons`); SMS links are `yeral.app/b/{code}` (ADR 0015: the client site sends booking
  codes to the booking detail). 51 API tests on Postgres.

- **2026-10-14 · M2f `@yeral/sdk`**: `createClient` (Hono RPC over `AppType`, cookies included, every failure an
  `ApiError` with the contract code, `network` when there's no answer), `keys`, `createSdk(client, queryClient)` with query
  and mutation options for auth, me, favourites, catalogue, free times and bookings (mutations cache the returned booking
  and invalidate lists and that business's free times), `startEvents` (poll every 10 s, on focus and on demand; event →
  stale keys). The api's booking action routes keep literal paths so each action is its own RPC route. MSW handlers for
  stories come with the first screens that need them (M3).

- **2026-10-14 · M2g Docker + Workers**: `infra/docker/api.Dockerfile` (pruned install, one bundled file, no
  node_modules at runtime), `infra/docker/compose.yml` (Postgres 18, migrate+seed, api, nginx) with `pnpm docker:up`,
  `infra/nginx` (JSON access logs, gzip, security headers, `api.yeral.localhost`), CI job «Docker stack» (health through
  nginx). The api's Workers entry (Hyperdrive client per request, cron → jobs) and `wrangler.jsonc`,
  verified in local workerd against Postgres. `db:setup` now seeds only an empty database (`db:seed` starts over).
  **Not deployed**: the api goes to production with M3 (2026-10-16: no staging, ADR 0020; operations.md).

- **2026-10-16 · M2 reviewed and merged** (#12–#19, follow-up #21): a code review of every PR before merging found
  ~70 issues. Fixed with a failing test first, among them: login-code guesses sent at once sharing one attempt counter,
  an offered time that could be taken repeatedly (`bookings.alternative_of` unique), a refused move dropping the earlier
  request, status changes overwriting each other (only from the status read), stale reminders after a move, availability
  offering a time whose hold had just run out, "Yzyna al" overfilling a class, an events cursor that skipped late commits
  (`<txid>.<id>`), rate limits trusting caller headers (`TRUSTED_IP_HEADER`), hidden prices leaking on the public page,
  `active` kept by Postgres (generated + trigger), a destructive seed by default and a seed that broke on most weekdays,
  the Worker's error handler without deps, overlapping cron runs (advisory lock), Hyperdrive caching, and the sdk caching
  a new booking under the old code and polling while signed out. Decisions and open points are in #21. M0–M2 released
  as tags (#20). The owner's direction (16.10): review every PR before merging (the agent merges after review and
  green CI); Ýeral is free for now (no plans, no commission); no staging, only local and production (ADR 0020); don't
  build the new yeral.app until the design is clarified and exported again (v0.5).
- **2026-10-16 · Design export v0.4 received** (`docs/design/CHANGELOG.md`): the business workspace complete (analytics,
  reviews, notifications, help, billing, B2B landing, tables, classes), design system v0.4 (`DS-Patterns`,
  `DS-Business` boards, `COMPONENTS.md` component map, token audit), tokens v0.4 mapped into `@yeral/ui` (`text-small`
  14/20, `text-micro`, `rounded-xs/sm`, `shadow-control`, `shadow-focus-inset`, `shadow-input-warning`, modal 560, chart
  colours); product rules (pricing: two plans + a commission layer; reviews under moderation aren't counted) in
  productContext; ADR 0012 revised (look up every screen piece in `COMPONENTS.md`; the boards win over drifted screens).
- **2026-10-17 · Design export v0.5 received and committed** (#27; tokens v0.5 `--ring-selected` → theme
  `shadow-ring-selected`): round 6 part A (free MVP, one
  account with several workspaces, fixed access levels + permission matrix, who answers requests, status icons, internal
  statuses, "Başga ýerde", phone web; `B-Login`, `B-Mobile`) and part B (`ROUND6-ANSWERS.md`: every item of the round-6
  request answered as the owner's decision; new `Booking-Link`; rule change A5: a move never swaps the specialist).
- **2026-10-17 · Strategy reset** ([ADR 0021](../decisions/0021-product-book-first.md)): all design and code paused; the
  product book (`docs/product/`) is written first, with its page for the owner's answers
  (https://claude.ai/artifact/LY9U6jrQRo3MfoHTg3JpyN). The owner (17.10): stop everything and reorganise: first
  document the whole product (ideas, norms, rules, roles, limits, features, MVP in and out, every flow, with visuals)
  until no question is left; then the full design and components/Storybook; then code. Claude Code writes the prompts
  for Claude Design, the owner pastes them, Claude Code reads the canvas to check the result. Where the old open
  questions (activeContext's numbers before the book) went: 16 and 18 (moving tables/classes; the round-6 logic gaps)
  → answered by design v0.5 (`docs/design/ROUND6-ANSWERS.md`); 17 (font sizes 28 / 24 / 80; open past midnight) →
  font sizes keep the code's mapping (v0.5, H), past midnight is feature F-109 in chapter 6; 1 (checkout / POS;
  table/class setup wizard) → features F-221 and F-116 in chapter 6, Q-030; 2 (CMS design) → Q-010, Q-011, Q-012; 4
  (average bills; store badges) → Q-103, feature F-004; 5 (native copy review) → Q-101; 6 (SMS provider and sender
  name) → Q-109, chapter 8 (notifications); 7 (final name and domain) → Q-003; 10 (real business photos and texts) →
  Q-002.
- **2026-10-18 · Decision room considered and dropped:** a brief for "Karar" (#28) was written and removed; the repo
  and the book page stay the way decisions are made and recorded. New book question Q-037 (Turkmen law 519-V: personal
  data also stored in Turkmenistan), Q-032 updated with the 2025 IP-range blocking. The owner (18.10): a shared
  decision room (first a claude.ai page "Karar", then an own app) was considered and dropped: the repo stays the record
  agents read, the book page stays where the owner answers, and Claude syncs the answers; an own decisions app only
  when a second person decides regularly or syncing becomes a bottleneck. Next: the owner answers every book question;
  then an exact plan for yeral.app, the business app, the CMS and the backend, including when and what server to buy.
- **2026-10-18 · Book answers, batch 1:** Q-001–Q-003 and Q-100–Q-109 written into the book; ADR 0022 (English
  first, languages per market); Claude's concerns recorded on Q-003, Q-101, Q-103, Q-104, Q-105, Q-107 (new `concern:`
  line, shown on the page); new questions Q-131–Q-134; features F-238 (add a business for its owner), F-240 (city
  choice) and F-109 (past midnight) in the MVP, F-239 (menu) later; F-178 CMS moved to MVP. The owner's answers
  (18.10): Ýeral isn't a Turkmen-only platform: it's built in English, and each country it launches in adds its own
  languages and settings (Turkmenistan first: Turkmen, Russian; ADR 0022 supersedes 0016's Turkmen first). One launch
  with the client site, the business app and the CMS; the team adds the first businesses in the CMS; Ýeral on
  yeral.app; no average bill; businesses may be open past midnight and options stay flexible; the city is a choice
  (Q-001–Q-003, Q-100–Q-109).
- **2026-10-18 · Book closed:** the last four questions answered (Q-004 English pilot with example businesses and a
  demo workspace; Q-005 *Ýeral* spelling; Q-036 no SMS at the first launch, codes on screen; Q-216 specialist without
  the app as an option). Build plan written as book chapter 10. The owner's words: the first launch is an English pilot
  with Turkmenistan's settings: example businesses marked "Example" beside real ones, a nightly-reset demo of the
  business app, no SMS (codes on screen); the name is written *Ýeral*, "Yeral" only where the letter can't be used; a
  specialist may work without the app (an option, not a level).
- **2026-10-18 · Book answers, batch 2:** 106 more answers written into the book: the owner's for most questions, the
  recommended option for the rest (owner delegated non-critical questions; marked "Claude (delegated)" in chapter 9).
  Two launches: first in English on Cloudflare, then Turkmenistan on its own servers; [ADR 0023](../decisions/0023-one-deployment-per-market.md)
  (one deployment per market). No review-ask SMS (Q-259); "Başga ýerde", internal statuses and the business PWA in the
  MVP; phone-only staff set to Never by the owner, reopened as Q-216; client karma later (F-241). Four critical
  questions left: Q-004 (who the first launch is for), Q-005 (name spelling), Q-036 (paying for SMS), Q-216. The page
  keeps Claude's decisions changeable ("Decided by Claude" filter) and marks the owner's later replies as "Changed".
  The owner (18.10, batch 2): answers only critical questions; Claude decides the rest with the recommended option and
  records it ("Claude (delegated)"), saying so where it disagrees (a concern). Two launches: first in English on
  Cloudflare (investors and early users, from Turkmenistan through a VPN; also a portfolio piece), then Turkmenistan
  with Turkmen, Russian and its own servers and database, after investment; one deployment per country (ADR 0023). No
  server to buy for the first launch (changed 19.10: the VPS). Appointments first, tables and classes after the MVP;
  no review-ask SMS; "Başga ýerde", internal statuses and the business PWA in the MVP; client karma later.
- **2026-10-19 · Two tracks start:** design pass round 1 (design system in English, #33) with Claude Design, round 2
  (business app part 1) written; the owner's netcup VPS 1000 (EU) set up with a shared Caddy, Postgres and the api
  (#34, `infra/server`); the backend runs alongside the design (ADR 0021 amended); the first launch runs on that
  server (ADR 0023 revised). The owner (19.10): the backend runs alongside the design, components and the apps wait
  for it; the netcup VPS 1000 (EU) is for the first launch and other projects, and Claude set it up the same day
  (hardening, a shared Caddy, Postgres and the api; `infra/server/README.md`); backups to R2 wait. Later the same day:
  Neon isn't needed, work on the VPS; review the backend plan for gaps, then build the backend alongside the design.
  [ADR 0024](../decisions/0024-own-server-docker-caddy.md): the own server runs every app (Docker + Caddy, Postgres
  beside the api); no Neon, no Workers for the api (supersedes 0007 for them).
- **2026-10-19 · Backend plan reviewed, P2 step 0 done:** chapter 10's P2 checked against all 51 **Code differs**
  items and the built api (#36): steps 0–7, with the missing fixes, photos, the address pin, notifications, team
  accounts with a second factor, deploys, backups and alerts. Step 0: the api's Workers path, Neon and nginx removed;
  the local Docker stack and CI use Caddy like the server, and CI validates the server's Caddy config;
  `/v1/places/ip` removed (it only worked on Workers); the SMS log no longer keeps every message in memory;
  `YERAL_DB_PORT` for machines where 5432 is taken ([ADR 0024](../decisions/0024-own-server-docker-caddy.md)).
  Review fixes: Caddy caps bodies at 10 MB, sets security headers and an access log; sign-in codes never reach the
  log; `TRUSTED_IP_HEADER` keeps only `x-forwarded-for`; only an A record until Docker's IPv6 is on.
- **2026-10-19 · P2 step 1, market settings:** `@yeral/domain/market` (`MARKET` = Turkmenistan: English only for the
  first launch, TMT, +993 rules, Asia/Ashgabat with a test against the zone's real offset); time, phones, money and
  the default language read it. English is the default and the source of the message keys; `?lang=` defaults to the
  market's main language; new users and SMS without a chosen language use it (Q-292; migration 0004 drops the
  database's `'tk'` default). Business texts need any one language (Q-102): `localized()` falls back asked → main →
  written, the SQL helpers do the same, and search matches every language. SMS take the brand from `common.brand`.
  `manatSchema` → `moneySchema`; `PhoneInput` takes the market's prefix and groups. ADR 0023 revised: one `MARKET`
  constant until a second market exists.
- **2026-10-19 · P2 step 2, part 1 (the team model):** three fixed levels and the fixed permission table in
  `@yeral/domain/permissions` (11 rows, `canAnswerRequest()` with the business's `requestAnswerers` and the per-person
  override); the `staff` row is the team member (account, level, override, `lastOpenedAt`); `invites` table (7 days,
  hashed link, expired read from the time); `roles` and `memberships` dropped by migrations 0005 (data moved) and 0006;
  the database keeps one active owner, one row per account, a phone without the app, the owner with the app. Signing
  in no longer joins a team; invited people aren't on the client site; an owner can't delete their account
  (`owns_workspace`). [ADR 0025](../decisions/0025-fixed-levels-team-rows-invites.md). Part 2 in the same PR: the
  switcher (`/v1/me/workspaces` with request counts by the who-answers rule, the last opened), the person's invites
  (list, accept, decline, the link), the owner's team endpoints (invite, resend, cancel, without the app and switching
  it on, level and override, remove with bookings kept, reactivate) and leaving; live events follow the level; a
  deleted account's rows leave their teams; `@yeral/contract/team`, `sdk.team`. P2 step 2 done.
- **2026-10-20 · P2 step 3, the booking engine to the book** (21 PRs, each reviewed with `code-review` and fixed
  before merging; details in `log/2026-10-20-p2-*.md`): past midnight `46f6eba` (#41); holds count only opening hours
  `926fe24` (#42); night reminders at 21:30 `2ab7a0b` (#43); the city as data `e82254d` (#44); offered times name one
  specialist `3f95736` (#45); the no-show limit restarts when lifted `8fca4fb` (#46); move rules `25413c8` (#47) and
  outcomes `e04b213` (#48); token links in SMS and the link page `bb12b70` (#49); one no-show limit rule `d05a647`
  (#50); no review asks `288bc83` (#51); linking by phone for 6 months, "Is this you?", a phone change keeping client
  records `0d74925` (#52, migration 0017); login-code limits `2b38b79` (#53); account deletion deletes reviews from the
  ratings `35119c8` (#54); name and surname `f5ae0ed` (#55, migration 0018); time limits on no-shows, complaints,
  reviews `c62685c` (#56, ADR 0017 revised); waiting-request limits `49e3e54` (#57); the cancel reason setting
  `f5d7fdf` (#58); the four undo reasons `b737a56` (#59); the typical answer time `2731729` (#60, migration 0019);
  phone-only clients and paused businesses on the business page `b7c7822` (#61). Open: #62 (owner's preview, F-032).
  The reviews found real bugs before merging (deadlocks between deletion and other actions, a way past the waiting
  limit through "Yzyna al", stale per-viewer caches, an unhandled rejection that could stop the api, racing rating
  updates). Gaps found, not fixed: folded into later entries and activeContext's Next steps. The owner (20.10): build
  step 3 one PR at a time, each reviewed with `code-review` (fix what it finds) and merged on green CI; at the end of
  the day stop, summarise, continue in another session. Design track: small iterations, one main board per prompt
  (ADR 0021 amended); later the same day: move on from design to building, design only when it's critical (Claude
  Design for an undrawn detail only), slice by slice: components in Storybook, then the apps (ADR 0021 amended).
  [ADR 0017](../decisions/0017-booking-model.md) revised for complaints ("Gelmedi" from the start until 24 h after the
  end and taking the place of an earlier complaint; "Gijä galdy" from the start; others any time). Every "how" Claude
  decided while building step 3 is a 20.10.2026 row in the book's chapter 9 marked "Claude (delegated)" for the owner
  to look over: Q-270, Q-171, Q-172, Q-156, Q-206 revised, Q-254, Q-126, Q-124, Q-163, A6, Q-113, Q-267, Q-168, Q-165,
  Q-127, Q-159, Q-107, Q-120, Q-105.
- **2026-10-20 · P2 step 3 finished, step 4 begun, the backend reviewed** (each PR reviewed with `code-review` and
  fixed before merging; details in `log/2026-10-20-p2-*.md`). Step 3: the owner's preview of a page in review
  `32d906d` (#62); offers keep a request on top of Upcoming `f285044` (#64); no average bill, "Price at the place"
  `cb68085` (#67); lateness fixed at 15 min `3eeb085` (#68); a price range filter `041cfb4` (#69); late reminders
  dropped and the give-up alert line `d8ee90d` (#70); busy elsewhere `420d5d1` (#71, migration 0020). Step 4: booking
  rules `604464c` (#72); services menu `422547d` (#74); profile with the address pin `7d35f34` (#75, migration 0021);
  answering requests `a072307` (#76); the team's bookings by phone and walk-in, free times and undo `388f52c` (#78);
  moving and cancelling `1f5a2ee` (#79, migration 0022); hours and special days with keep or cancel-and-offer
  `501579f` (#80, migration 0023). Docs lookup `pnpm book show|refs|toc` and the TypeScript LSP for agents `e6fd349`
  (#73). The owner then had the backend reviewed (#78–#80): 15 findings, a five-PR plan
  (`log/2026-10-20-p2-review-fixes.md`): one first SMS per booking, worded when it goes from what the client knows
  (`bookings.told`) `62627b2` (#81, migration 0024); bookings and hours saves ordered under the business row, requests
  on a closed day declined `276e50f` (#82, migration 0025). The reviews of #81 and #82 found more (an SMS sent before a
  booking's undo could come, bookings made before `told` never told of a move, lock-order deadlocks), all fixed before
  merging. Left: PR 3 (contract), PR 4 (structure), PR 5 (SMS caps, step 7). The owner (20.10, later): go on with
  step 4 the same way; talk in English only (Turkmen product words translated); then review the backend api for best
  practices, architecture, patterns and the decisions, make a plan of fixes and work it PR by PR (PR 1–4 now, PR 5
  with step 7), then step 4 goes on; save the progress at the end of the session. Step 4 and the review fixes added
  more 20.10.2026 "Claude (delegated)" rows to chapter 9: the booking rules (B-41, B-42), the menu (B-38), the profile
  (B-37, Q-215), requests (B-19–B-21), the team's bookings (B-23–B-25), move and cancel (B-26, B-27), hours and
  special days (B-39, B-40, Q-211), the SMS a booking's changes send (B-24, B-26: what the client knows,
  `bookings.told`), and bookings vs an hours save (Q-211).
- **2026-10-20/21 · P2 steps 4–7 and P4 slice 1** (each PR reviewed with `code-review` and fixed before merging;
  details in `log/2026-10-20-*` and `log/2026-10-21-*`). Backend, 20.10: a business cancel as a code `bbcdae5` (#84);
  clients hear when a business moves `46a5546` (#86, migration 0026); the engine's shared pieces `29643e6` (#87);
  staff schedules and removing someone `25fb650` (#90); blocked time `d5603a8` (#93, 0027); internal statuses
  `029a2d8` (#94, 0028); the calendar view `88677dd` (#95). 21.10: the code on the screen `a362d86` (#98); complaints
  and no-shows `124e33c` (#100, 0029); clients `ee5e856` (#101), `d5c9ac2` (#103); the bookings list and export
  `7bfaf2b` (#104); the team's reviews `97064a6` (#106, 0030); `canChangePhone`, `answersRequests` `d4afcd0` (#109).
  The stack that waited for Actions, merged in order by web-b2: the setup draft `77f3aa3` (#112, 0031); photos
  `6933f56` (#116, 0032); the 5-minute warning and invites' expiry `df66427` (#117, 0033); floor and room `c9527e3`
  (#120, 0034); the Ýeral team's sign-in `c4abb8a` (#122, 0035, ADR 0026); verify, send back, hide `a0daa19` (#123,
  0036); reported reviews `f2c7cc4` (#124, 0037); closing a workspace `d612d2f` (#125, 0038); adding a business for its
  owner `91b0028` (#126); the first launch's examples, appointments only `302e886` (#127); a business's SMS limits
  `a72bfb8` (#128); the sitemap data `1f88435` (#129). Slice 1 (accounts) built: the business app `4422c06` (#99), its
  sign-in `b8bf3a9` (#102), the sdk forgets the last person `85472bc` (#107), the shared sign-in `5c8d3a6` (#108), the
  client site `cee0027` (#110), the mobile prefixes `bca2eb6` (#111), the shell's components `dae89a4` (#113), the
  client's login `5c3985e` (#114), the login's invites `1d7dc04` (#115), the client's profile `9dd5c01` (#118), the
  business shell `950cc1b` (#119), My account `b5a8adf` (#121), slice 1's how decisions `9ae5baa` (#131). Releases
  paused `76ed572` (#133, ADR 0009 amended). Ýeral's support line `580811e` (#134); the flaky demo-bookings test fixed
  `a2e0418` (#135). Main at a2e0418 deployed to the server by hand, then `23a1c14` (#139) the same evening (migrations
  0000–0038). The owner (21.10): backend and api only in this session (design in another); clients hear when a
  business moves (#86); release when possible, without waiting for the design, Storybook or the frontend. The repo is
  public (Actions run again). At a wall (CI not running, billing, a missing secret or account, a decision only the
  owner can make): stop the work that depends on it, send a push notification, report, wait; the same failure twice is
  a wall; no stacking work that can't merge; one review round per PR; an unattended run needs a goal and a budget
  (global `~/.claude/CLAUDE.md`). "Lets remove release logic for now. We are under development. There is no even
  working MVP version." → no releases, versions or changesets until the MVP works, back before the first launch (P2
  step 7); the `release` skill became `ship` (#133). The owner had web-b2 fix and merge every open PR; the backend
  stack merged in order the same day. Ýeral's support line is the owner's phone and Telegram until it has its own
  (#134); deploy main to the server by hand (done the same day); "delete everything unnecessary" and "delete
  everything we don't need anymore" (left to the owner); keep `yeral-proto` until all the web apps are live. Business
  decisions: the recommended option when it isn't critical; a critical one goes to the owner in the chat before the
  work starts, with its full description (no IDs to look up). On the code on the screen (Q-036): "Go with option B …,
  its demo version still. When we launch in TKM we will add real phone number code protection." → no real businesses
  at the first launch. The day's "how" rows are 21.10.2026 rows in chapter 9 marked "Claude (delegated)": photos, the
  timed notices, the floor, the admin tool's sign-in, businesses, reviews, closing and adding, the first launch, the
  SMS limits, and slice 1's (#105, #131); they stand (the recommended option unless critical).
- **2026-10-21 (evening) · P2 step 6 finished, the frontend's gaps closed** (each PR reviewed with `code-review`, one
  round, and fixed before merging; details in `log/2026-10-21-*`): six concerns settled `0b58ef9` (#137); no business
  verified while the code shows on the screen `9d97d5a` (#138, ADR 0023 amended); `GET /v1/auth/mode` for the
  sign-in screens `23a1c14` (#139); the business logo `cc2c06b` (#140, migration 0039); the "Continue setting up"
  card's data `9874568` (#141); the demo workspace made again every night `d3fc296` (#143, 0040); what the leave and
  delete confirms touch `aa3fe98` (#142); the switcher's page state, specialization and reviews to answer `0c6a8b7`
  (#144); a day in the demo workspace for any visitor `62709b5` (#145, ADR 0019 amended); two unused columns dropped
  `10c3bce` (#147, 0041, the first contract migration); the demo note on both sign-ins `3469215` (#146). Left open:
  #148 (the "How was it?" card's api, in conflict after #147) and `feat/api-address-search` (no PR yet). The six
  concerns settled (chapter 9, 21.10.2026): Q-299 the SMS safety limit stays, Q-270 no password, Q-259 a "How was it?"
  card once per completed visit (F-243, no SMS), Q-105 flexible where businesses differ with good defaults, Q-103 a
  price level later (F-244), Q-101 a native proofread before the Turkmenistan launch. Q-036's concern was critical;
  the owner chose: no real businesses at the first launch, they come with the Turkmenistan launch's real SMS sign-in;
  while the code shows on the screen the api verifies nothing (`verify_unavailable`;
  [ADR 0023](../decisions/0023-one-deployment-per-market.md) amended, #138).
  [ADR 0019](../decisions/0019-own-phone-login-and-sessions.md) amended: the demo workspace's sessions in a cookie of
  their own (#145). The book has no open question left.
- **2026-10-22 · The owner's answers:** no backups and no error tracking or uptime alerts for the demo launch (with
  the real working MVP, P6; Claude's concern on the uptime check); the first launch approved in advance; the DNS
  records for `api`, `business` and `cms` now (`infra/server/README.md`, "DNS records"); book chapter 9, 22.10.2026.
  Later the same day the old site was retired: `yeral.app` and `www` point at the server now too, and the apex shows a
  coming-soon page from Caddy until the client site takes it over; then `apps/legacy` and the Worker go. The owner's
  words: "Backups are not necessary for now. We can add it later on real working MVP. Error tracking is also not
  favorite for demo one." → both come with the real working MVP, before any real business's data (P6; F-211, F-209);
  uptime alerts wait with them (Claude's concern: nobody hears that the demo is down; a free uptime check could come
  back alone); until then the api's alert lines stay in its Docker logs, read at each deploy. "I approve launch": the
  first launch is approved in advance and goes out once the apps are built and checked locally. The owner adds the DNS
  records; for the admin account nothing secret goes through the chat. "i dont think we need current working
  yeral.app, lets make dns for it too" → the coming-soon page in `infra/server/yeral/yeral.caddy`; after the switch the
  owner deletes the Worker `yeral-web` and a PR removes `apps/legacy` (done 23.10). No ADR: the book's chapter 9,
  22.10.2026 (DNS for the own server: Claude, delegated).
- **2026-10-23 · yeral.app on the own server:** the owner's A records for `@`, `www`, `api`, `business` and `cms` (DNS
  only, 22.10); the coming-soon page `5c07be4` (#150); main at 5c07be4 deployed by hand with `PUBLIC=1` after a
  database backup (migrations 0039–0041; Let's Encrypt certificates for `yeral.app`, `www`, `api`; `www` → the apex;
  `api.yeral.app/v1/health` answers). The old site left the repo: `apps/legacy`, its deploy option and smoke check,
  its ignore, lint-hook, Renovate, Turborepo and pnpm entries `1bda69d` (#151). The owner deleted the Worker
  `yeral-web` the same evening. The deploy went out 2026-10-22 21:18 UTC (23.10 the owner's time); kept on the server:
  `/srv/yeral/backup-2026-10-23-before-5c07be4.sql.gz` (mode 600, as every backup there) and the edge config
  `/srv/edge/Caddyfile.before-2026-10-23`. The owner (23.10): "Lets go back to email settings later. FOr now lest go
  with deploy and other tasks." → the e-mail records waited (lock down, or receive mail at an address through Email
  Routing); replaced by the next evening's answer (below).
- **2026-10-23 (night) · P4 slice 2 started, P2 step 4 finished** (an unattended 2-hour run, each PR reviewed with
  `code-review`, one round, on green CI; details in `log/2026-10-21-how-was-it.md`, `log/2026-10-21-address-search.md` and
  `log/2026-10-23-setup-wizard.md`): the "How was it?" card's api
  `d4d4042` (#148, F-243, migration 0042); the address search behind the map pin `93c8a09` (#153, ADR 0027: a
  geocoder port, Photon over OpenStreetMap); the wizard's pieces in `@yeral/ui` (ProgressBar, WizardFooter, vertical
  Stepper, Field counter and optional) `e75cd83` (#152); the wizard's frame and business step `9fedd9f` (#154); the
  login reopens an unfinished setup `782e05d` (#155, B-07 revised); the draft's category id `a3c0eda` (#156). Not
  deployed (the server runs 5c07be4). The owner (23.10, night): "Lets go. U have 2 hours, do not hit the wall more
  than 3 times. And do not make the macbook heat, by using too much cpu/gpu and etc." Seven PRs merged, no wall.
- **2026-10-23 (evening) · The setup wizard built end to end** (a second unattended 2-hour run, the same way; details
  in `log/2026-10-23-setup-{address,hours,rules,services,done,team,phone}.md` and
  `log/2026-10-23-starter-services.md`): the night's docs `c4ef6a8` (#157); `@yeral/ui`: TimeRangeField and Select
  sizes `e61cdc2` (#158), MapFrame (MapLibre + OpenFreeMap, lazy, a drawn ground offline) and Combobox `7b5324a`
  (#159), InputGroup `75c5b56` (#164), SettingsRow and OptionCard L `1a6cc47` (#163), Checklist, QrBlock (lean-qr) and
  CopyField `cf2e295` (#168); the api: each category's starter services in groups `af0d97e` (#165), the services step's
  menu in one transaction `b217727` (#167), the team step's people in one transaction, invites sent at the finish, a
  draft's team readable `9bdf8f4` (#171); the wizard's steps: address `3b104e2` (#162, replacing #161, closed when
  its base branch went), hours `00bfdd5` (#160, with `dayHoursProblem`: the api refuses opening and closing at the
  same time),
  booking rules `3acada4` (#166), done with the link, the QR and the finish `d806340` (#169), services `72c4d04`
  (#170), phone for someone signed out (`features/sign-in`, shared with the login) `bf282fb` (#172), team `d11ec52`
  (#173). Deployed 2026-10-25 (below). Gaps left: in Next steps (activeContext). The owner (23.10, evening): deleted
  the Worker `yeral-web` and the untracked `docs/design/Claude outputs/`; "can we set getting email for yeral?" →
  receive mail at `hello@` through Cloudflare Email Routing, forwarded to the owner's inbox, with a DMARC record
  against mail sent in yeral.app's name; sending stays off (the owner sets it up; `infra/server/README.md`, "DNS
  records"; no ADR: the book's chapter 9, 23.10.2026, DMARC reject, the details Claude's, delegated). Docker Desktop
  stays as it is (the api tests run in CI, not locally). "Lets continue on tasks, u have one more 2 hours" → the rest
  of the wizard, #157–#173, no wall.
- **2026-10-24/25 (night) · Settings built** (an unattended run of 2 + 2 hours, three agents, each PR reviewed with
  `code-review`, one round, on green CI; details in `log/2026-10-24-*.md`): the night's docs `14e2b0f` (#174); the
  frame and Link and QR `a219a92` (#177), Permissions read-only `f160fa5` (#179); booking rules: the shared form
  `edd925b` (#176, `NumberStepper`), the page `8917c10` (#178), the booking statuses `a5d5e1a` (#182, `SwatchPicker`,
  `IconPicker`); hours: the affected-bookings details `b688d41` (#175, api), the page with the keep-or-cancel step
  `3370760` (#180), special days `45164be` (#183), «Fri, 16 Oct» `3dea92e` (#191); Business profile: details and logo
  `a840f2a` (#184), photos `40028aa` (#187, `PhotoManager`), the address `2946fbb` (#190, `features/edit-address`);
  services: the list `d0e8466` (#186, `AvatarStack`), the drawer, delete and groups `797e7de` (#189,
  `ChipRadioGroup`); Team's list `3d796e1` (#188); follow-ups `7884f7c` (#181); a flaky client story `6c9d0a0` (#185).
  The owner (24.10): "Go for 2 hours, email settings leave for other session. Focus on yeral." Extended by 2 hours the
  same night: Settings built but Team's add and drawer; the e-mail records waited for another session.
- **2026-10-25 · The business app live, the owner's test fixed** (an all-day run): the business app at
  `business.yeral.app` with the code on the screen `07952fd` (#192), deployed 08:42 UTC; that deploy skipped its
  backup, fixed `a0a0433` (#193, `log/2026-10-25-business-live.md`). The owner's test: the disabled button, the toast,
  selects' figures `a00e9dc` (#194); «You already have a business» `3dc74cb` (#195); services groups as cards, named in
  the wizard and renamed in Settings `1c8a8e9` (#197); the done step's link and QR as Settings shows them `592cfd2`
  (#199); a tab icon without the light frame `0c78de0` (#200); ADR 0011 amended, forms are plain state, AGENTS.md rule
  10a `94c2767` (#196). Deployed at 592cfd2, 10:45 UTC (a backup first). Then: «Add a team member» `c35d70a` (#198);
  the page address a business chooses, its api with migration 0043 `50d532e` (#201). The owner (25.10): "i dont wanna
  check locally, go live on our domains." Asked, the owner chose the business app only at `business.yeral.app` (the
  apex keeps the coming-soon page; the example businesses and the demo workspace stay off) with the sign-in code on
  the screen, open to anyone (anyone who types a number signs in as it: test data only; the book's chapter 9,
  25.10.2026; no ADR). #192: `deploy.sh` builds the business image, a `business` service, `business.yeral.app` in
  `yeral.caddy`. After testing it live: six fixes asked (the disabled button, the toast, digits in selects, «Create a
  business» again for someone who has one, naming the own services' group, clearer service groups) and the done step's
  QR as clear as Settings'. "Go with recommendation. The main idea is not overcomplicating things. For example if we
  can use some library for date picker and etc. Lets use it, no need for making own one." →
  [ADR 0011](../decisions/0011-state-management.md) amended: a form is the owning slice's hook with plain state, no
  TanStack Form; a well-known library before our own component (AGENTS.md rule 10a). A business chooses its own page
  address instead of `turkmen-barber-2` ("add it to the plan"); updates feel slow rather than instant. Kept on the
  server: `/srv/yeral/backup-2026-10-25-after-07952fd.sql.gz` (the one before it was skipped),
  `backup-2026-10-25-before-592cfd2.sql.gz`, the site files `/srv/edge/sites-yeral.caddy.before-07952fd`.
- **2026-10-25 (afternoon and evening) · Slice 2 finished, slice 3's booking loop built** (four agents, each PR
  reviewed with `code-review`, one round, on green CI; details in `log/2026-10-25-*.md`, the plan in
  `log/2026-10-25-slice-3-plan.md`). Slice 2: the staff drawer's api `08145e0` (#203), profile, services and access
  `32a78fb` (#206), removing someone `30fdec3` (#210), hours and time off `1ca15cf` (#213); the page address's screens
  `775545a` (#205); one-tap changes at once and fewer reads `8e002ca` (#202); the date picker on react-day-picker
  `4d2826e` (#207); «Left» vs «Removed» `1b4650c` (#234, migration 0044) and `c80979c` (#236); Business profile's
  address in the Settings layout `f837277` (#229); the step list's counts `cdda2f6` (#239) and `6731636` (#241); the
  Russian-length switch in Storybook `aedecb2` (#238) and its fixes `82d29dd` (#242). Infra: the client site on
  `yeral.app` and the example businesses on `8ebb8bc` (#208), deployed 13:46 UTC with the owner's go. Slice 3, shared:
  Pill, TimerPill, StatusDot, ExampleBadge `d0cd476` (#209); Price, KeyValueList, Timeline, ChangeSummary, Quote
  `c7e477d` (#212); ActionBar, TimeSlots multi-pick, Stepper `9c369c6` (#214); BackLink, PageHeader,
  RatingDistribution, RatingInput, the drawer's pager `9a581d5` (#217); the push channel (server-sent events nudged by a
  Postgres NOTIFY, ADR 0028) `57370fc` (#211); My bookings' rows `9a401c5` (#215); free times to offer `d00566a`
  (#219); a move's `fits` `5d1448c` (#227); specialists' next free time `ac7e915` (#220); booking items' ids `3b19f25`
  (#240). The client: the business page `b02680e` (#216) and its sections `27a112f` (#225); the booking steps `7d101d0`
  (#221); confirm and sent `dbcbad0` (#224); My bookings `ecf7204` (#232); the booking drawer `741ac6c` (#237); move
  mode `e9f4a0e` (#244); the review form `fb67465` (#235) and its wiring `4b6b35a` (#245); a typecheck break between
  #235 and #240 fixed `0c603bb` (#243). The business: the calendar's day `2dfefc5` (#218), its layers `1586148`
  (#222), the request drawer `548b666` (#223), declining with offered times `7240a90` (#226), a move request
  `8c41857` (#228) and its fit line `c62a5cc` (#231), the phone day `cb750d6` (#230).
  `make-example` (D2) `9c83869` (#233). Deployed 2026-10-26 11:20 UTC at `74fae7d` with the owner's go (migration
  0044, a backup first); then Ýeral paused for the week (owner). The owner (25.10, later): "U have whole day to work on
  this tasks, dont limit yourself" (a run until about 23:00 MSK). Asked about slice 3: the client site takes
  `yeral.app` now (noindex until the launch), the example businesses go on, and one of the owner's test businesses can
  be opened to clients with a server command (the book's chapter 9, 25.10.2026). Kept on the server:
  `/srv/yeral/backup-2026-10-25-before-8ebb8bc.sql.gz`, `backup-2026-10-26-before-74fae7d.sql.gz`, the site files
  `/srv/edge/sites-yeral.caddy.before-{latest,client}`. Flaky once: the business calendar story «Confirm Request»
  (#245).
- **2026-10-26/27 · Paused: the token budget, a review, the README:** 26.10 the day's agents had taken the weekly
  limit to 52 % (four agents resumed all day re-read ~500k tokens of context at every step); the owner: "U can use as
  many agents u want, but when its context full, drop it, and start a new one … limit yourself on a week plan. We can
  not spend more tokens that we have for a weekly limit." → the weekly token budget for agents (ADR 0014 amended,
  AGENTS.md → "Token budget") `e7941e5` (#247); the day's fold (#246); "For this week we stop working on yeral. push
  all the changes and deploy them" → merged and deployed at 74fae7d (above), no open PRs. 27.10: "Lets make it public
  repo and some words about still in development, i need this for my portfolio" → the repo was public already (21.10);
  a README for visitors with the in-development status, the live sites, what works and how it's built, and the repo's
  About (description, homepage, topics) `bd6659c` (#248); Ýeral may be shown in the owner's portfolio, always as in
  development; the README's credit line stays. A two-week review of the project (a private page for the owner) found:
  no end-to-end test yet; `main` without branch protection, so two PRs merged on a stale base broke it once (#240
  after #235, fixed in #243) — "no need for branch protection, we are still developing, we will turn it on when we
  finish with demo app" (owner; operations.md → "Repository"); no HSTS or CSP on the sites; backups only on the
  server's own disk until P6; long files and activeContext's history weighing on every session. The support phone and
  Telegram leave the repo for the server's config, with Ýeral's own e-mail beside them (owner). Memory bank `b56648c`
  (#249), the 27.10 answers `ec19bd6` (#250). E-mail for `hello@yeral.app` set up by the owner (checked 27.10:
  Cloudflare's three MX, SPF, DKIM and the `_dmarc` reject record; `infra/server/README.md`, "DNS records").
- **2026-10-30 · Resumed:** the owner tested `hello@yeral.app` from another account: it arrives, the address is
  configured. The order of work chosen: (1) hygiene — activeContext.md trimmed into this file (history older than a
  week folded into the entries above, the file down from 327 lines to about 135), the support line out of the repo
  with `hello@` beside it, HSTS + CSP in `yeral.caddy`; (2) close P4 slice 3 with its end-to-end check and the first
  Playwright test; (3) slice 4, then 5; (4) slices 6 + 7, then the first launch (P5).

- **2026-10-30/31 · Hygiene, slice 3 closed but for its e2e flows, slice 4 planned, the agents' rules** (#251–#262;
  details in `log/2026-10-30-*.md`, `log/2026-10-31-*.md`): activeContext trimmed 327 → 139 lines `8c89d3c` (#251);
  `MyBooking` rows carry their review, the list its `total` `8c2c2e7` (#252); HSTS and a per-site CSP, the client
  site's with a per-request nonce from TanStack Start, header checks in CI's stack (#253, merged 31.10 after a
  rebase); move mode's free times from the booking's own items, a move losing a service refused `ead8090` (#254);
  the support contacts from the environment, `hello@yeral.app` beside phone and Telegram, `MARKET.support` gone
  `4214734` (#255); move mode on the own-items reads, the rules on the confirm step, «Add to calendar» after an instant
  move `107b153` (#256); the «How was it?» card, «You rated», the review's refusal `3b9d849` (#257); Playwright and the
  first two flows in CI's Docker stack, ADR 0013 amended `45875d8` (#258); the slice 4 plan `fee793e` (#259); the
  tabs' counts, the «Call» link's name, the «Confirm Request» flake `0da8d69` (#260); ADR 0014 amended — one agent at
  a time, two at most, one on battery, no worktree per agent — and `gh pr merge` allowed `d058c11` (#261); the
  special-day story on a month's last day (#262: `main` was red on the 31st for it, 741/742). The owner (30.10):
  `hello@yeral.app` works; "Lets work with order u recommended. For agents also use at least high effort with
  fable"; "No need to wait for reset, u can go till limit is reached … fable has own different limits". The night
  took Fable's weekly limit (164M tokens read, 25 agents, ~13M a PR); 31.10 the owner: "third of the week is too
  much, why we need that amount?" → ~7 % a day; then, after `kernel_task`/`fseventsd` above 300 % on battery (17
  worktrees, 14 GB, orphaned Postgres and dev servers): "Two agents at time … Does this worth it?" → the rules in ADR
  0014 and the owner's global `agent-runs` skill (`log/2026-10-31-agents-one-at-a-time.md`); "allow gh pr merge".
  Parked as drafts when the limit cut the agents off: #263 (e2e flows), #264 (A1), #265 (U1), #266 (U2). Not
  deployed: the server stays at 74fae7d until the owner's go (the three `.env` lines first).

## Roadmap

**Re-planned 2026-10-18:** the product book is closed and its chapter 10 (`docs/product/10-plan.md`) is the build plan:
P1 design pass in English, P2 backend to the book, P3 components, P4 apps slice by slice, P5 first launch on
Cloudflare, P6 Turkmenistan launch. The M3–M8 rows below are kept for reference only.

Infrastructure first (owner, 2026-10-13). Each milestone ends reviewed, merged, memory bank updated; production
deploys come from releases (no staging, ADR 0020).

| # | Milestone | Scope | Done when |
|---|---|---|---|
| M0 ✅ | **Monorepo foundation** | pnpm 12 workspace + catalog; Turborepo + generators; `@yeral/config` (tsconfig, ESLint, Prettier, Steiger, Vitest presets); lefthook + commitlint; Changesets; `ci.yml`, `release.yml`, `deploy.yml`; Renovate; issue templates + Project board; `PORT_BASE`; `AGENTS.md`; the Next app moved to `apps/legacy`, still serving `yeral.app` | `pnpm i && pnpm build && pnpm lint` green locally and in CI; legacy deploys from CI |
| M1 ✅ | **Design system** | `@yeral/ui` from web DS v0.3.1 (`docs/design/tokens.css`, `screens/system/*`): tokens → Tailwind `@theme`, Onest self-hosted; buttons (primary, secondary, ghost, tint, danger × S/M/L, loading), icon button, inputs and fields (label, hint, error), +993 phone, select, hero and compact search, chips, tabs, segmented, checkbox, radio, switch, status badges (5 + phone + cancelled-by), avatar, rating, skeleton, empty state, modal (400/480/640), drawer (480), popover, toast (ink, undo), bottom sheet under 768, date strip, time slots, month picker, top nav, sidebar + rail, language switcher, breadcrumbs, pagination, table base; `apps/storybook` on `storybook.yeral.app`; `pnpm gen ui-component`; Vitest browser tests (interactions, a11y, screenshots) | the Foundations and Components sheets are reproduced in Storybook at 1440 and 390; CI runs the story tests |
| M2 ✅ | **Platform** | `@yeral/domain` written for the multi-category model (ADR 0017): categories, booking types, booking rules (confirm mode, hold, lead, window, buffer, step, cancel window, no-show block), availability for appointment (staff shifts and breaks, multi-service chains, any specialist, buffers), table (party, areas, holds), class (seats); 5 statuses + `cancelledBy`, decline, complaint; permissions (ADR 0018); geo distance; booking codes; legacy rule tests carried over. `@yeral/contract`, `@yeral/i18n` (`tk` verbatim from the screens, `ru`, `en`), `@yeral/lib` (site config), `@yeral/sdk`; `apps/api`: Drizzle schema for the client **and** business model (staff, memberships, roles, clients, notes, verification) + migrations + seed from both demo-data files and the 13 categories, own phone login (dev code, ADR 0019), endpoints for every client screen, SMS port with the design's templates, jobs (expire at hold time, complete, reminders), OpenAPI; Dockerfiles + Compose + nginx; api on Cloudflare with Neon (production deploy comes with M3; no staging, ADR 0020) | every client screen's data comes from the API with tests; `pnpm docker:up` serves the stack locally |
| M3 | **Client site on yeral.app** | `apps/client` (TanStack Start + FSD) built screen by screen in the design's order: shells (marketing, search, focused booking headers, footer) → Home → Search + MapLibre → Business page → appointment booking with inline login → table and class booking → login modal → my bookings (drawer, cancel, review) → profile and favourites → states → phone pass → RU/EN; `/tk` `/ru` `/en`, `head()` + hreflang + JSON-LD, category pages `/{lang}/c/{category}`, sitemap; Playwright for every flow; replaces the coming-soon page on the apex (the old site, `apps/legacy`, was retired 2026-10-23) | each page matches 1440 and 390, every state in `screens/README.md` is reachable, keyboard works, TK verbatim + RU/EN; the owner signs it off |
| M4 | ~~Landing~~ | dropped 2026-10-14: the marketplace is on yeral.app (ADR 0015); the B2B pricing page belongs to `business.yeral.app` | — |
| M5 | **Business workspace** | designed in rounds 4–5 (`docs/design/business/`, design v0.4), built in the design's order: shell (sidebar, switcher, top bar, rail) → calendar (day all staff → request/booking/new drawers, decline and complaint modals, drag to move → day one staff → week) → bookings and requests table → clients + client card → setup wizard (8 steps) → settings (profile, rules, hours + special days, link + QR, branches) → services → team, invite, roles; phone login; PWA; then reviews and replies, analytics, notification settings, help, billing, B2B landing + pricing, tables, classes (round 5). Known gap: the online party limit is a business setting in B-Tables (2–12, default 8) but a constant (`MAX_ONLINE_PARTY`) in the code | e2e: client sends → business confirms → client sees it; a specialist with own visibility sees "Bes" |
| M6 | **CMS** | waits for the designer's round 3 (six modules): staff accounts, businesses (onboarding, moderation), users, complaints, category catalogue (icons, TK/RU/EN names, booking types, starter services), content; Cloudflare Access | the team can onboard a business and add a category without a release |
| M7 | **Growth and SEO** | OG images, client PWA, performance budgets, analytics, store badges and app links | Lighthouse targets met; previews render in messengers |
| M8 | **Own server** | for the Turkmenistan launch, after investment (ADR 0023; not needed for the first launch): reachability test from Ashgabat, Compose stack live, data moved from Neon/R2, DNS switched, CI deploys over SSH; the market's SMS provider and push (SMS at the first launch: book Q-036) | the sites open in Ashgabat without a VPN |
