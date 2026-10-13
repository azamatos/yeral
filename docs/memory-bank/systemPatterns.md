# System patterns (architecture)

Status 2026-10-13: **target architecture, agreed; migration not started.** The live code is still the Next.js app in
`src/` (see `progress.md`). Everything below marked *planned* does not exist yet.

## System map

```
   yeral.app ──────────┐ short links /{slug} → 301 client.yeral.app/{slug}
   (landing, static)   │ search box → client.yeral.app/search?q=
                       ▼
   client.yeral.app  (TanStack Start, SSR)  ──┐
   business.yeral.app (SPA, PWA)            ──┼──►  api.yeral.app/v1  (Hono)
   cms.yeral.app     (SPA, access-gated)    ──┘        │
                                                       ├─ modules (catalog, availability, bookings, biz/*, admin/* …)
                                                       ├─ @yeral/domain rules
                                                       └─ Store port ─► memory store (demo)  |  Postgres via Drizzle (planned)
```

One session cookie on `.yeral.app` serves client and business; the CMS has its own accounts and cookie.

## Monorepo layout

```
yeral/                         github.com/azamatos/yeral
├─ apps/
│  ├─ landing/    yeral.app           TanStack Start, prerendered to static HTML
│  ├─ client/     client.yeral.app    TanStack Start, SSR for public pages, client-only for account/booking
│  ├─ business/   business.yeral.app  Vite SPA + TanStack Router, installable (PWA)
│  ├─ cms/        cms.yeral.app       Vite SPA + TanStack Router
│  └─ api/        api.yeral.app       Hono + zod-openapi; Node entry, Cloudflare entry for the demo
├─ packages/
│  ├─ domain/     @yeral/domain    types, Ashgabat time, booking rules, phone, money. Pure TS, zero deps, DOM-free
│  ├─ contract/   @yeral/contract  zod schemas of everything on the wire: DTOs, inputs, enums, error codes
│  ├─ sdk/        @yeral/sdk       typed API client (Hono RPC), ApiError, query keys, queryOptions and mutations, SSE → invalidation
│  ├─ i18n/       @yeral/i18n      use-intl setup, shared messages (ru, tk), formatters (money, dates, plurals)
│  ├─ ui/         @yeral/ui        design tokens (Tailwind @theme), primitives on Radix, DS components, cn(). No domain
│  ├─ entities/   @yeral/entities  cross-app entity UI (status badge, staff avatar, price, rating…)   — created when a 2nd app needs it
│  ├─ features/   @yeral/features  cross-app user actions (phone auth, …)                            — created when a 2nd app needs it
│  ├─ lib/        @yeral/lib       framework-free helpers: .ics, maps/tel links, safe storage, env parsing
│  └─ config/     @yeral/config    tsconfig bases, ESLint, Prettier, Steiger configs
├─ docs/          memory-bank/, decisions/, API.md
├─ .claude/       skills/, settings.json
├─ .github/       workflows/, renovate.json
├─ .changeset/
└─ turbo.json · pnpm-workspace.yaml (with the dependency catalog) · package.json · lefthook.yml · CLAUDE.md
```

### Package dependency rules

```
config      ← everything (dev only)
domain      ← contract, i18n, entities, features, apps/*
contract    ← sdk, entities, features, api
sdk         ← entities, features, client, business, cms, landing      (type-only import of AppType from api)
i18n        ← entities, features, apps/*                         (ui stays text-free: labels come in as props)
ui          ← entities, features, apps/*                               (ui imports nothing internal except config)
entities    ← features, apps/*
features    ← apps/*
lib         ← anything (imports nothing internal)
```

- A package never imports an app. The single exception is `import type { AppType } from '@yeral/api'` inside `@yeral/sdk`.
- A package lists every internal package it imports in its `package.json` (`workspace:*`); pnpm's strict
  node_modules makes undeclared imports fail.
- Packages are consumed as TypeScript source (`exports` → `./src/*.ts`); no build step for internal packages.

## Feature-Sliced Design inside each app

Layers, top to bottom; a layer imports only from layers below it:

| Layer | Holds | Example (client) |
|---|---|---|
| `app/` | entry, providers, router, `routes/` (file-based, thin), global styles | `routes/$slug.tsx` → loader + head + `SalonPage` |
| `pages/` | one slice per screen; composes everything below | `pages/salon`, `pages/booking`, `pages/account-bookings` |
| `widgets/` | large blocks used by 2+ pages | `widgets/header`, `widgets/salon-map` |
| `features/` | one user action with business value | `features/toggle-favorite`, `features/cancel-booking`, `features/pick-slot` |
| `entities/` | app-specific views of a business object | `entities/salon` (`SalonCard`), `entities/booking` (`BookingRow`) |
| `shared/` | app-only config, sdk instance, helpers, small ui wrappers | `shared/config/env.ts`, `shared/api/sdk.ts` |

Below `shared/` sit the packages: they are the cross-app part of the lower layers.

- **Slices** (`pages/salon`, `features/cancel-booking`) don't import each other on the same layer. Entities that must
  reference each other use FSD's `@x` cross-import (`entities/booking/@x/salon.ts`); rare and explicit.
- **Segments** inside a slice: `ui/`, `model/` (hooks, stores, zod schemas, search-param schemas), `api/`
  (slice-specific queryOptions), `lib/`, `config/`. Use only the ones you need.
- **Public API**: every slice has `index.ts`; import a slice only through it. Shared and packages export by subpath
  (`@yeral/ui/button`), not one giant barrel.
- **Pages first** (FSD 2.1): write code in the page slice; move it down a layer when a second consumer appears; promote it
  to `packages/` when a second *app* needs it.
- **Routes stay thin**: `createFileRoute(...)({ validateSearch, loader, head, component })`, with the search schema and
  the component imported from the page slice. The route tree lives in `src/app/routes` (`routesDirectory` config).
- Enforced by **Steiger** (`pnpm lint:fsd`) per app and by ESLint import rules.

## Data flow

```
component ─► useQuery(sdk.salon.detail(slug)) ─► hc client ─► GET api.yeral.app/v1/salons/:slug
                                                                 │ zod validates input
                                                                 ▼
                                             module route → service (uses @yeral/domain rules) → Store port
```

- Components never call `fetch` or the client directly: they use `queryOptions` / mutations from `@yeral/sdk`
  (or a slice's `api/` segment that wraps them).
- Mutations invalidate by query keys defined in `@yeral/sdk`; optimistic updates only where the UI needs instant
  feedback (favourite toggle).
- **Live updates** (*planned*): `GET /v1/events` (Server-Sent Events) streams `{ type, ids }`; `@yeral/sdk` turns events into
  query invalidations. A booking confirmed in the business app updates the client's screen without polling.

## State: where each kind lives

| Kind | Tool | Example |
|---|---|---|
| server data | TanStack Query via `@yeral/sdk` | salons, availability, bookings |
| URL state | TanStack Router search params validated by zod | search filters, wizard step and picks, calendar date/view |
| form state | React Hook Form + zod schemas from `@yeral/contract` | profile, service editor, booking rules |
| local UI state | `useState` / `useReducer` | an open popover |
| cross-component UI state | Zustand store in the slice's `model/` (rare) | calendar zoom, drawer stack in business |

No global client store. If something feels like it needs one, it's usually server state or URL state.

## Rendering

| App | Mode | Notes |
|---|---|---|
| landing | prerendered at build (static files) | any unknown single-segment path → `301 client.yeral.app/{slug}`; salon slugs can't use reserved landing paths |
| client | SSR for home, search, salon, category/district pages; `ssr: false` for account, booking, login | loaders `ensureQueryData` → dehydrated into the page; `head()` gives title, description, canonical, hreflang, OG, JSON-LD |
| business, cms | SPA, `index.html` fallback | no SEO; `noindex` |

## Backend (`apps/api`)

```
apps/api/src/
  app.ts            OpenAPIHono, middleware (request id, logging, CORS for *.yeral.app, session, error mapper), /v1 router
  modules/<name>/   routes.ts (createRoute + handler) · service.ts (use cases; calls @yeral/domain) · store.ts (the port it needs)
                    auth · catalog · availability · bookings · reviews · favorites · notifications · events
                    biz/{calendar, requests, clients, services, team, rules, hours, reviews, analytics, settings} · admin/*
  store/            memory/ (demo: seed + mutations) · pg/ (planned: Drizzle on Postgres)
  demo/             seed (24 salons), synthetic occupancy, salons that answer by themselves, demo worlds
  jobs/             (planned) reminders, expiring requests, notifications — pg-boss
  entry/node.ts · entry/worker.ts
```

- Services hold the rules; routes only validate, call a service and map the result. The same service code runs on the demo store and on Postgres.
- OpenAPI 3.1 is generated from the routes and served at `api.yeral.app/docs` (Scalar). It's the contract for anyone
  outside the monorepo (a future mobile app, partners).
- **Demo worlds** (*planned*, M2): a `yeral_demo` cookie on `.yeral.app` picks the visitor's world (seed + their changes),
  so the client and business tabs share it. Worlds expire when idle; «Сбросить демо-данные» resets one.
- **Double booking** (*planned*, real backend): Postgres exclusion constraint on staff × time range for active bookings,
  plus the domain check; the API answers `409 slot_taken` with alternatives.

## Auth

- Client and business: phone + SMS code → session cookie `yeral_session` (httpOnly, Secure, SameSite=Lax,
  Domain=`.yeral.app`). One person can be a client and a salon member at once; business access = membership in a salon
  with a role (owner, admin, master, reception).
- CMS: separate staff accounts and cookie, two-factor, plus a gate in front of the host (access policy / IP allow-list).
- Mutations check `Origin` against `*.yeral.app`. Mobile apps (later) use bearer tokens.

## i18n

- `use-intl` (the framework-free core of next-intl, so today's `useTranslations` calls and ICU messages carry over).
- Locales: `ru` now, `tk` next. Shared namespaces (`common`, `categories`, `status`, `errors`, units) in `@yeral/i18n`;
  app namespaces in `apps/<app>/messages/{ru,tk}.json`. Keys are typed per app.
- Landing and client put the locale in the URL for SEO (`/tk/...`); business and cms take it from the user's settings.
- Numbers, money, dates and plurals only through `useFmt()` / ICU, always in `Asia/Ashgabat`.

## Conventions the whole system relies on

- Salon dates are `YYYY-MM-DD` strings in Ashgabat time; times of day are minutes from midnight (`870` = 14:30);
  instants are epoch milliseconds. Use `@yeral/domain/time`; never derive a salon date from `new Date()` directly.
- Money: whole manats (integers).
- API errors: `{ error: { code, message?, details? } }` with the right HTTP status; codes are an enum in `@yeral/contract`;
  the UI shows `errors.<code>` from i18n. `@yeral/sdk` throws `ApiError`.
- Each route has `errorComponent` and `notFoundComponent`; failed mutations show a toast; form errors sit next to fields.
- **No third-party hosts at runtime**: fonts are system or self-hosted, map tiles self-hosted (*planned*: PMTiles
  extract of Turkmenistan), error reports go through our own endpoint. Strict CSP (`self` + our hosts).
