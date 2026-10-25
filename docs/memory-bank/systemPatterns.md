# System patterns (architecture)

Status 2026-10-13: **target architecture, agreed; migration not started.** The live code is still the Next.js app in
`src/` (see `progress.md`). Everything below is *planned* until its milestone lands.

## System map

```
   yeral.app/{tk,ru,en} ── client marketplace (TanStack Start, SSR) ──┐
   business.yeral.app ──── business workspace (SPA, PWA)           ───┼──► api.yeral.app/v1 (Hono) ──► Postgres
   cms.yeral.app ───────── cms (SPA, team accounts + 2nd factor)   ───┘          │                (Docker, beside the api)
   storybook.yeral.app ─── design system (static)                                ├─ @yeral/domain rules (4 booking types)
                                                                                  ├─ jobs: runDueJobs() every minute
                                                                                  └─ files: storage port (server disk)
```

The api, its jobs, Postgres and the apps run on the own server in Docker behind a shared Caddy; Cloudflare keeps DNS and
Storybook (ADR 0024; the old Next.js site was retired on 2026-10-23). Site map: ADR 0015.
One session cookie on the parent domain serves the client site and the business workspace; the CMS has its own accounts and cookie.

## Monorepo layout

```
yeral/                           github.com/azamatos/yeral
├─ apps/
│  ├─ client/      yeral.app — TanStack Start, SSR for public pages, client-only for account/booking; /tk /ru /en
│  ├─ business/    Vite SPA + TanStack Router, installable (PWA)
│  ├─ cms/         Vite SPA + TanStack Router
│  ├─ api/         Hono + zod-openapi + Drizzle; entry/node.ts (Docker on the own server)
│  └─ storybook/   Storybook 10: stories from packages/* and app slices
├─ packages/
│  ├─ domain/      @yeral/domain    market settings, types, business time, booking rules, phone, ids. Pure TS, zero deps
│  ├─ contract/    @yeral/contract  zod schemas of everything on the wire: DTOs, inputs, enums, error codes
│  ├─ sdk/         @yeral/sdk       typed API client (Hono RPC), ApiError, query keys, queryOptions, mutations, events poller
│  ├─ i18n/        @yeral/i18n      use-intl setup, shared messages (en source; tk, ru), formatters
│  ├─ ui/          @yeral/ui        design system: tokens, base styles, components (Radix + cva), cn(). No domain, no text
│  ├─ entities/    @yeral/entities  cross-app entity UI (status badge, staff avatar, price…) — when a 2nd app needs it
│  ├─ features/    @yeral/features  cross-app user actions, one subpath per slice: auth-by-phone (the sign-in steps)
│  ├─ lib/         @yeral/lib       framework-free helpers: .ics, maps/tel links, safe storage, env parsing, site config
│  └─ config/      @yeral/config    tsconfig bases, ESLint, Prettier, Steiger, Vitest presets
├─ infra/
│  ├─ docker/      Dockerfiles per deployable, compose.yml + Caddyfile (production-like), compose.dev.yml (Postgres)
│  └─ server/      the own server: setup.sh, edge/ (shared Caddy), yeral/ (compose, deploy.sh, yeral.caddy)
├─ turbo/generators/  `pnpm gen` templates: package (M0); ui-component, slice, endpoint, app (later)
├─ scripts/        version-stamp.mjs (/version.json), smoke.sh (post-deploy checks)
├─ docs/           memory-bank/ (+ log/), decisions/, design/ (Claude Design export, read-only), API.md
├─ .claude/        skills/, agents/, settings.json
├─ .github/        workflows/, renovate.json, ISSUE_TEMPLATE/
└─ AGENTS.md · CLAUDE.md · turbo.json · pnpm-workspace.yaml (catalog) · package.json · lefthook.yml · .node-version
```

### Package dependency rules

```
config      ← everything (dev only)
lib         ← anything                                   (imports nothing internal)
domain      ← contract, i18n, entities, features, api, apps
contract    ← sdk, entities, features, api, apps
sdk         ← entities, features, client, business, cms   (type-only import of AppType from api)
i18n        ← entities, features, apps                   (ui stays text-free: labels come in as props)
ui          ← entities, features, apps, storybook
entities    ← features, apps
features    ← apps
```

- A package never imports an app. The single exception is `import type { AppType } from '@yeral/api'` inside `@yeral/sdk`.
- A package lists every internal package it imports in its `package.json` (`workspace:*`); pnpm's strict
  `node_modules` makes undeclared imports fail.
- Internal packages are consumed as TypeScript source (`exports` → `./src/*.ts(x)`); no build step.

## Feature-Sliced Design inside each app

Layers, top to bottom; a layer imports only from layers below it:

| Layer | Holds | Example (client) |
|---|---|---|
| `app/` | entry, providers, router, `routes/` (file-based, thin), global styles | `routes/$lang/b/$slug.tsx` → loader + head + `BusinessPage` |
| `pages/` | one slice per screen; composes everything below | `pages/business`, `pages/booking-appointment`, `pages/account-bookings` |
| `widgets/` | large blocks used by 2+ pages | `widgets/search-header`, `widgets/results-map` |
| `features/` | one user action with business value | `features/toggle-favorite`, `features/cancel-booking`, `features/pick-slot` |
| `entities/` | app-specific views of a business object | `entities/business` (`BusinessCard`), `entities/booking` (`BookingRow`) |
| `shared/` | app-only config, sdk instance, helpers, small ui wrappers | `shared/config/env.ts`, `shared/api/sdk.ts` |

Below `shared/` sit the packages: they are the cross-app part of the lower layers.

- **Slices** don't import each other on the same layer. Entities that must reference each other use FSD's `@x`
  cross-import (`entities/booking/@x/salon.ts`); rare and explicit.
- **Segments** inside a slice: `ui/`, `model/` (hooks, stores, zod schemas, search-param schemas), `api/`
  (slice-specific query wrappers), `lib/`, `config/`. Use only the ones you need.
- **Public API**: every slice has `index.ts`; import a slice only through it. Packages export by subpath
  (`@yeral/ui/button`), not one giant barrel.
- **Pages first** (FSD 2.1): write code in the page slice; move it down a layer when a second consumer appears; promote it
  to `packages/` when a second *app* needs it.
- **Routes stay thin**: `createFileRoute(...)({ validateSearch, loader, head, component })`, with the search schema and
  the component imported from the page slice. The route tree lives in `src/app/routes` (`routesDirectory` config).
- **The app layer** (as built in `apps/business`): `app/entrypoint/` (`main.tsx`, the providers, the router),
  `app/routes/`, `app/routeTree.gen.ts` (written by the router plugin, committed so types check without a build) and
  `app/styles.css`. Steiger refuses segments named for what they are (`providers`, `components`), hence `entrypoint`.
  The client site (TanStack Start) has no `main.tsx`: `app/entrypoint/router.tsx` exports `getRouter()` (a router, an
  `Api` and a query cache per request on the server, once in the browser, with the SSR query integration),
  `site-api.ts` passes the visitor's cookie on when the server renders, and `routes/__root.tsx` writes the document
  (`shellComponent`: `<html lang>`, `HeadContent`, `Scripts`, the providers).
- Enforced by **Steiger** (`pnpm lint:fsd`) per app and by ESLint import rules. Details: skill `fsd`, ADR 0004. Each FSD
  app has a `lint:fsd` script and `steiger.config.js` re-exporting `@yeral/config/steiger` (the plugin's recommended
  rules: a layer imports only from below, slices never from each other); the `@/` alias resolves through `tsconfig`.
- An app's screens have stories next to them (`pages/<screen>/ui/*.stories.tsx`, titles `Business/…`); Storybook loads
  them beside `@yeral/ui`'s and resolves `@/` against the importing file's app (`.storybook/main.ts`).

## Data flow

```
component ─► useQuery(sdk.businesses.detail(slug)) ─► hc client ─► GET api.yeral.app/v1/businesses/:slug
                                                                 │ zod validates input
                                                                 ▼
                                   module route → service (@yeral/domain rules) → Drizzle repository → Postgres
```

- Components never call `fetch` or the client directly: they use `queryOptions` / mutation options from `@yeral/sdk`
  (or a slice's `api/` segment that wraps them).
- Mutations invalidate by query keys defined in `@yeral/sdk`; optimistic updates only where instant feedback matters:
  the sdk's `instant` (the services' online switch, a group's rename, the photos' order and removal) writes the change
  into the cache before the request and puts the old data back, and asks again, when the api refuses; the screen toasts
  why (2026-10-25).
- **Reads**: queries stay fresh 15 s (`me` a minute); the business app's workspaces and setup draft 5 minutes, since
  only the person's own mutations and the events change them and both refresh them (booking events refresh the
  switcher's request counts). A settings change refreshes the switcher and the draft only for the profile and the
  booking rules (its event refreshes everything once more); opening a workspace marks it current in the cached list
  without reading it again. TanStack's focus refetch stays: answers that change with time (free times) have no event.
- **Live updates** (ADR 0028): the api writes an event per change (`booking.confirmed`, `booking.created` …) to an
  `events` table, in one place (`emit`, `apps/api/src/notify.ts`), with a Postgres `NOTIFY yeral_events` carrying its
  business and user (sent when the transaction commits). Each api process LISTENs on a connection of its own and nudges
  the open `GET /v1/events/stream` streams (server-sent events, `modules/events/live.ts`) of that user and of everyone on
  that business's team; a nudge carries nothing. The sdk (`startEvents`) keeps the stream open while someone is signed
  in and the tab is visible and, on each nudge, reads `GET /v1/events?after=<cursor>` and invalidates the matching
  queries (who sees what stays decided there); it also reads every 60 s (the fallback), on window focus and after the
  user's own mutations. The cursor is `<txid>.<id>`: events are read in the order of the transaction that wrote them,
  only once every older transaction has finished, so one that commits late is never skipped; while one of the person's
  is held back that way, the answer says `held` and the sdk reads again in 1, 2, 4 … 30 s. "Every older transaction" is
  server-wide: a long one (a demo re-seed) holds updates back until it ends. A tab opened in the background takes its
  starting point at once, so it hears what changed before it was first looked at. The person's own change comes back as
  an event too and refreshes its keys a second time (events don't name who made them). The stream answers
  `Cache-Control: no-cache, no-transform`, so Caddy's `encode` leaves it alone, and `reverse_proxy` flushes
  `text/event-stream` at once; a comment line every 25 s keeps it open and checks the session.

## State

One owner per kind of state (ADR 0011): server data → TanStack Query; anything a link should restore → router search
params (zod); unsaved form input → the slice's form hook (`useState`, rules in `model/`; ADR 0011 amended 2026-10-25); one subtree → `useState`; client-only state shared by distant components
→ a Zustand store in the owning slice's `model/`; changes made elsewhere → events → query invalidation. No global store.

## Rendering

| App | Mode | Notes |
|---|---|---|
| client | SSR for home, search, category and business pages; `ssr: false` for account, booking, login | `/` → the signed-in person's language, else the browser's (`Accept-Language`) when the site has it, else the market's main one (book Q-132; 307); `/{lang}` validated against `MARKET_LOCALES`, anything else the 404 (`notFoundMode: 'root'`, HTTP 404); `/b/{slug}` → `/{lang}/b/{slug}`; the root loader asks for `me` with the visitor's cookie, so the header is right on the server; loaders `ensureQueryData` → dehydrated into the page; `head()` through `pageHead()` gives title, description, canonical, hreflang, OG (JSON-LD with the business pages); pages with the header and footer sit under the pathless `$lang/_site` layout |
| business, cms, storybook | static SPA, `index.html` fallback | `noindex` |

## Backend (`apps/api`)

```
apps/api/src/
  app.ts            OpenAPIHono, middleware (request id, logging, CORS for configured sites, auth session, error mapper), /v1
  modules/<name>/   routes.ts (createRoute + handler) · service.ts (use cases) · repo.ts (Drizzle queries, where a module has many)
                    health · auth (codes, identity, sessions) · me (profile, favourites, account) · catalog (search, cards,
                    pages, cities) · availability (context: the business and busy time as the domain needs them)
                    bookings: create.ts and actions.ts (the client's), engine.ts (shared with the team's paths), confirm.ts,
                      offers.ts, links.ts, address-sms.ts, view.ts (DTOs), repo.ts
                    calendar (the team's bookings: free times, by phone and walk-in, move, cancel) · requests (answering)
                    settings (booking rules, profile, hours) · menu (services) · team (levels, invites, who is on which team)
                    clients (the phone-only block) · reviews (ratings) · events (live feed) · jobs (runDueJobs)
                    admin (the Ýeral team's sign-in and accounts, `requireAdmin`; businesses: the review queue, verify,
                      reject, hide, close, add for an owner; reported reviews kept or removed) · setup (the wizard's draft) · media (photos kept without their metadata, dropped once nothing
                      points at them; `uploadGuard` before an upload's body is read)
                    later: the rest of the business endpoints (P2 step 4: schedules, clients, reviews…) · admin/*
  db/               schema/*.ts (Drizzle), migrations/ (SQL), seed/ (docs/design demo data + 13 categories)
  jobs/             runDueJobs(): expire requests at holdUntil, complete visits, reminders, SMS
  ports/            sms (written to the log everywhere until a gateway; dev code 1234), storage (photos people upload:
                    the server's disk in `MEDIA_DIR`, memory in tests), clock
  config.ts         one place that reads env (process.env)
  entry/node.ts     one pool, the app, the jobs tick every minute
```

- Services hold the rules; routes only validate, authorise, call a service and map the result to contract DTOs.
- A rule a schema can't express refuses with `invalid(...issues)` (`http/errors.ts`), the same 400 shape zod's give.
- Independent queries on a `Queryable` go through `all(db, [...])` (`db/client.ts`): parallel on the pool, one after
  another in a transaction.
- Paths that change a booking take locks in one order (book Q-211): the account, then the business's hours
  (`lockedHours`), then the booking, then its move request; `setStatus` writes a status change only from the status
  it read (`StaleBooking` otherwise).
- OpenAPI 3.1 is generated from the routes and served at `/docs` (Scalar).
- Double booking: Postgres exclusion constraint on staff × time range for active bookings + the domain check → `409 slot_taken`.
  A move request's items share their booking's `family`, so a move may overlap the booking's own time (book Q-165); a
  partial unique index keeps one waiting move per booking.
- Demo behaviour (code `1234`, demo businesses that answer by themselves) is on outside production only.

## Auth

- Client and business: phone + 4-digit code → httpOnly session cookie on the parent domain (`SameSite=Lax`, `Secure`);
  our own `modules/auth` with `users`, `login_codes`, `sessions`, `rate_limits` tables (ADR 0019).
- "Try the business app" (book F-242): a day as the demo workspace's owner (a demo account, `users.demo`) in a second
  cookie, `<prefix>.demo`, which the api reads first only for the business app's Origin, so the client site keeps the
  person's own session; `demoGuard` lets a demo account reach the demo workspace's day-to-day routes and nothing else
  (deny by default) and refuses any real number in what it types (`demo_number`).
- Business access = the person's `staff` row in that workspace (ADR 0025): linked to their account (`userId`), active,
  with the app. Three fixed levels (owner, administrator, specialist) and one fixed permission table
  (`@yeral/domain/permissions`: `none · own · all`, the team row `view · manage`); the api checks it and leaves out what a
  level can't see (a specialist sees only their own column; money without `revenue` is left out). Invites are their own
  table and wait for the person to accept or decline. One person can be a client and on several teams at once.
- Admin tool (cms.): the Ýeral team's own accounts (`admins`, never a phone account), a login, a password (PBKDF2) and
  an authenticator code (TOTP) or a recovery code at each sign-in; the secrets sealed under `ADMIN_SECRET_KEY`; its own
  cookie `<prefix>.admin` on the api's host, `SameSite=Strict`, path `/v1/admin`, 12 hours; `/v1/admin/*` only from
  the cms origin; every change written to `admin_actions` (ADR 0026).
- Mutations check `Origin` against the configured sites. Mobile apps (later) use bearer tokens.

## Configuration, domains and brand

- `@yeral/lib/site` reads one config per environment: site URLs (client, business, cms, api, storybook),
  cookie domain, brand name key. Apps and api never hard-code `yeral.app`.
- The brand name is an i18n message (`common.brand`); logos live in `@yeral/ui/brand`. A rename = env + messages + logo files.
- Every app serves `/version.json` (`{ app, version, commit, builtAt }`).

## i18n

- `use-intl` (the framework-free core of next-intl): today's `useTranslations` calls and ICU messages carry over.
- Locales: English is the source of keys and the default; each market adds its own (Turkmenistan: `tk`, `ru`) (ADR
  0022). `LOCALES` = every language with translations (the database's enum); `MARKET.languages` = what this
  deployment offers (`['en']` for the first launch). Shared namespaces (`common`, `status`, `errors`, `sms`, units) in
  `@yeral/i18n`; app namespaces in `apps/<app>/messages/{en,tk,ru}.json`. Keys are typed per app; CI checks all three exist.
- The api accepts any translated `?lang=`; without one it answers in the market's main language. Texts written per
  language (`Localized`) fall back: asked → market's main → whichever was written (Q-102); search matches every language.
- The client site puts the locale first in every URL (`/{lang}/b/{slug}`); business and cms take it from the user's settings.
- English is the source copy; screens drawn in Turkmen are the reference for `tk`; no city names written into copy.
- Numbers, money, dates, distances and plurals only through `useFmt()` / ICU, in the market's time zone and currency
  (`MARKET`: `Asia/Ashgabat`, `TMT` for Turkmenistan).

## Conventions the whole system relies on

- Business dates are `YYYY-MM-DD` strings in the business's local time (the market's zone); times are minutes from the
  midnight that starts the business day (`870` = 14:30), up to 2880 for a day open past midnight (`1500` = 01:00 the
  next morning, still that day's); instants are epoch milliseconds. Use `@yeral/domain/time`; never derive a business
  date from `new Date()` directly. Busy time across midnight: `busyOn()` (`@yeral/domain/availability`); the database
  compares bookings in absolute minutes (`span`, migration 0007).
- Money: whole manats (integers).
- API errors: `{ error: { code, message?, details? } }` with the right HTTP status; codes are an enum in `@yeral/contract`;
  the UI shows `errors.<code>` from i18n. `@yeral/sdk` throws `ApiError`.
- Each route has `errorComponent` and `notFoundComponent`; failed mutations show a toast; form errors sit next to fields.
- Portable code only (ADR 0007): web-standard APIs, no Cloudflare-only storage for product data.
