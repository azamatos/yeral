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

## Roadmap

Infrastructure first (owner, 2026-10-13). Each milestone ends merged, deployed to staging, memory bank updated.

| # | Milestone | Scope | Done when |
|---|---|---|---|
| M0 ✅ | **Monorepo foundation** | pnpm 12 workspace + catalog; Turborepo + generators; `@yeral/config` (tsconfig, ESLint, Prettier, Steiger, Vitest presets); lefthook + commitlint; Changesets; `ci.yml`, `release.yml`, `deploy.yml`; Renovate; issue templates + Project board; `PORT_BASE`; `AGENTS.md`; the Next app moved to `apps/legacy`, still serving `yeral.app` | `pnpm i && pnpm build && pnpm lint` green locally and in CI; legacy deploys from CI |
| M1 ✅ | **Design system** | `@yeral/ui` from web DS v0.3.1 (`docs/design/tokens.css`, `screens/system/*`): tokens → Tailwind `@theme`, Onest self-hosted; buttons (primary, secondary, ghost, tint, danger × S/M/L, loading), icon button, inputs and fields (label, hint, error), +993 phone, select, hero and compact search, chips, tabs, segmented, checkbox, radio, switch, status badges (5 + phone + cancelled-by), avatar, rating, skeleton, empty state, modal (400/480/640), drawer (480), popover, toast (ink, undo), bottom sheet under 768, date strip, time slots, month picker, top nav, sidebar + rail, language switcher, breadcrumbs, pagination, table base; `apps/storybook` on `storybook.yeral.app`; `pnpm gen ui-component`; Vitest browser tests (interactions, a11y, screenshots) | the Foundations and Components sheets are reproduced in Storybook at 1440 and 390; CI runs the story tests |
| M2 | **Platform** | `@yeral/domain` written for the multi-category model (ADR 0017): categories, booking types, booking rules (confirm mode, hold, lead, window, buffer, step, cancel window, no-show block), availability for appointment (staff shifts and breaks, multi-service chains, any specialist, buffers), table (party, areas, holds), class (seats); 5 statuses + `cancelledBy`, decline, complaint; permissions (ADR 0018); geo distance; booking codes; legacy rule tests carried over. `@yeral/contract`, `@yeral/i18n` (`tk` verbatim from the screens, `ru`, `en`), `@yeral/lib` (site config), `@yeral/sdk`; `apps/api`: Drizzle schema for the client **and** business model (staff, memberships, roles, clients, notes, verification) + migrations + seed from both demo-data files and the 13 categories, own phone login (dev code, ADR 0019), endpoints for every client screen, SMS port with the design's templates, jobs (expire at hold time, complete, reminders), OpenAPI; Dockerfiles + Compose + nginx; api on Cloudflare with Neon | every client screen's data comes from the API with tests; `pnpm docker:up` serves the stack locally |
| M3 | **Client site on yeral.app** | `apps/client` (TanStack Start + FSD) built screen by screen in the design's order: shells (marketing, search, focused booking headers, footer) → Home → Search + MapLibre → Business page → appointment booking with inline login → table and class booking → login modal → my bookings (drawer, cancel, review) → profile and favourites → states → phone pass → RU/EN; `/tk` `/ru` `/en`, `head()` + hreflang + JSON-LD, category pages `/{lang}/c/{category}`, sitemap; Playwright for every flow; replaces `apps/legacy` on the apex, legacy deleted | each page matches 1440 and 390, every state in `screens/README.md` is reachable, keyboard works, TK verbatim + RU/EN; the owner signs it off |
| M4 | ~~Landing~~ | dropped 2026-10-14: the marketplace is on yeral.app (ADR 0015); the B2B pricing page belongs to `business.yeral.app` | — |
| M5 | **Business workspace** | designed in round 4 (`docs/design/business/`), built in the design's order: shell (sidebar, switcher, top bar, rail) → calendar (day all staff → request/booking/new drawers, decline and complaint modals, drag to move → day one staff → week) → bookings and requests table → clients + client card → setup wizard (8 steps) → settings (profile, rules, hours + special days, link + QR, branches) → services → team, invite, roles; phone login; PWA. Waits for round 5: analytics, reviews and replies, notification settings, billing, B2B page, table/class management | e2e: client sends → business confirms → client sees it; a specialist with own visibility sees "Bes" |
| M6 | **CMS** | waits for the designer's round 3 (six modules): staff accounts, businesses (onboarding, moderation), users, complaints, category catalogue (icons, TK/RU/EN names, booking types, starter services), content; Cloudflare Access | the team can onboard a business and add a category without a release |
| M7 | **Growth and SEO** | OG images, client PWA, performance budgets, analytics, store badges and app links | Lighthouse targets met; previews render in messengers |
| M8 | **Own server** | when the owner buys it: reachability test from Ashgabat, Compose stack live, data moved from Neon/R2, DNS switched, CI deploys over SSH; production SMS gateway and push | the sites open in Ashgabat without a VPN |
