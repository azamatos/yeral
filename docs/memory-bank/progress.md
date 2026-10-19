# Progress and roadmap

## Done

- **2026-10-13 · Phase 0 + 1 (Next.js):** client marketplace on mock data: home, search with map and day rail, salon pages
  with JSON-LD, full-page booking wizard, phone login, my bookings and booking detail (cancel, move, proposal,
  review, «это не я»), favourites, profile, notifications, demo panel playing the salon. Live at https://yeral.app
  (Cloudflare Worker `yeral-web`, www → apex). Commits `3906655`, `f536f22`.
- **2026-10-13 · Architecture agreed** in two rounds with the owner: monorepo, four sites + api + Storybook, TanStack,
  FSD, state ownership, TypeScript backend on Postgres from the start, design system in Storybook, testing strategy,
  Cloudflare now / Docker + nginx later, Changesets, GitHub Actions, parallel agents. ADRs 0001–0014, this memory bank,
  `AGENTS.md`, project skills.

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
  a new booking under the old code and polling while signed out. Decisions and open points are in #21 and activeContext.
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
  (https://claude.ai/artifact/LY9U6jrQRo3MfoHTg3JpyN).
- **2026-10-18 · Decision room considered and dropped:** a brief for "Karar" (#28) was written and removed; the repo
  and the book page stay the way decisions are made and recorded. New book question Q-037 (Turkmen law 519-V: personal
  data also stored in Turkmenistan), Q-032 updated with the 2025 IP-range blocking.
- **2026-10-18 · Book answers, batch 1:** Q-001–Q-003 and Q-100–Q-109 written into the book; ADR 0022 (English
  first, languages per market); Claude's concerns recorded on Q-003, Q-101, Q-103, Q-104, Q-105, Q-107 (new `concern:`
  line, shown on the page); new questions Q-131–Q-134; features F-238 (add a business for its owner), F-240 (city
  choice) and F-109 (past midnight) in the MVP, F-239 (menu) later; F-178 CMS moved to MVP.
- **2026-10-19 · Two tracks start:** design pass round 1 (design system in English, #33) with Claude Design, round 2
  (business app part 1) written; the owner's netcup VPS 1000 (EU) set up with a shared Caddy, Postgres and the api
  (#34, `infra/server`); the backend runs alongside the design (ADR 0021 amended); the first launch runs on that
  server (ADR 0023 revised).
- **2026-10-18 · Book closed:** the last four questions answered (Q-004 English pilot with example businesses and a
  demo workspace; Q-005 *Ýeral* spelling; Q-036 no SMS at the first launch, codes on screen; Q-216 specialist without
  the app as an option). Build plan written as book chapter 10.
- **2026-10-18 · Book answers, batch 2:** 106 more answers written into the book: the owner's for most questions, the
  recommended option for the rest (owner delegated non-critical questions; marked "Claude (delegated)" in chapter 9).
  Two launches: first in English on Cloudflare, then Turkmenistan on its own servers; [ADR 0023](../decisions/0023-one-deployment-per-market.md)
  (one deployment per market). No review-ask SMS (Q-259); "Başga ýerde", internal statuses and the business PWA in the
  MVP; phone-only staff set to Never by the owner, reopened as Q-216; client karma later (F-241). Four critical
  questions left: Q-004 (who the first launch is for), Q-005 (name spelling), Q-036 (paying for SMS), Q-216. The page
  keeps Claude's decisions changeable ("Decided by Claude" filter) and marks the owner's later replies as "Changed".

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
| M3 | **Client site on yeral.app** | `apps/client` (TanStack Start + FSD) built screen by screen in the design's order: shells (marketing, search, focused booking headers, footer) → Home → Search + MapLibre → Business page → appointment booking with inline login → table and class booking → login modal → my bookings (drawer, cancel, review) → profile and favourites → states → phone pass → RU/EN; `/tk` `/ru` `/en`, `head()` + hreflang + JSON-LD, category pages `/{lang}/c/{category}`, sitemap; Playwright for every flow; replaces `apps/legacy` on the apex, legacy deleted | each page matches 1440 and 390, every state in `screens/README.md` is reachable, keyboard works, TK verbatim + RU/EN; the owner signs it off |
| M4 | ~~Landing~~ | dropped 2026-10-14: the marketplace is on yeral.app (ADR 0015); the B2B pricing page belongs to `business.yeral.app` | — |
| M5 | **Business workspace** | designed in rounds 4–5 (`docs/design/business/`, design v0.4), built in the design's order: shell (sidebar, switcher, top bar, rail) → calendar (day all staff → request/booking/new drawers, decline and complaint modals, drag to move → day one staff → week) → bookings and requests table → clients + client card → setup wizard (8 steps) → settings (profile, rules, hours + special days, link + QR, branches) → services → team, invite, roles; phone login; PWA; then reviews and replies, analytics, notification settings, help, billing, B2B landing + pricing, tables, classes (round 5). Known gap: the online party limit is a business setting in B-Tables (2–12, default 8) but a constant (`MAX_ONLINE_PARTY`) in the code | e2e: client sends → business confirms → client sees it; a specialist with own visibility sees "Bes" |
| M6 | **CMS** | waits for the designer's round 3 (six modules): staff accounts, businesses (onboarding, moderation), users, complaints, category catalogue (icons, TK/RU/EN names, booking types, starter services), content; Cloudflare Access | the team can onboard a business and add a category without a release |
| M7 | **Growth and SEO** | OG images, client PWA, performance budgets, analytics, store badges and app links | Lighthouse targets met; previews render in messengers |
| M8 | **Own server** | for the Turkmenistan launch, after investment (ADR 0023; not needed for the first launch): reachability test from Ashgabat, Compose stack live, data moved from Neon/R2, DNS switched, CI deploys over SSH; the market's SMS provider and push (SMS at the first launch: book Q-036) | the sites open in Ashgabat without a VPN |
