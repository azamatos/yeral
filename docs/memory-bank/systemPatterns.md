# System patterns (architecture)

Status 2026-10-13: **target architecture, agreed; migration not started.** The live code is still the Next.js app in
`src/` (see `progress.md`). Everything below is *planned* until its milestone lands.

## System map

```
   yeral.app ─────────── landing (static) ── short links /{slug} → 301 client.yeral.app/{slug}
   client.yeral.app ──── client (TanStack Start, SSR) ──┐
   business.yeral.app ── business (SPA)              ───┼──► api.yeral.app/v1 (Hono) ──► Postgres
   cms.yeral.app ─────── cms (SPA, access-gated)     ───┘          │                     (Neon now, Docker later)
   storybook.yeral.app ─ design system (static)                    ├─ @yeral/domain rules
                                                                    ├─ jobs: runDueJobs() every minute
                                                                    └─ files: S3 API (R2 now, MinIO/disk later)
```

Now every box runs on Cloudflare Workers; later on one server in Docker behind nginx (ADR 0007). One session cookie
on the parent domain serves client and business; the CMS has its own accounts and cookie.

## Monorepo layout

```
yeral/                           github.com/azamatos/yeral
├─ apps/
│  ├─ landing/     TanStack Start, prerendered
│  ├─ client/      TanStack Start, SSR for public pages, client-only for account/booking
│  ├─ business/    Vite SPA + TanStack Router, installable (PWA)
│  ├─ cms/         Vite SPA + TanStack Router
│  ├─ api/         Hono + zod-openapi + Drizzle; entry/worker.ts (Cloudflare) and entry/node.ts (Docker)
│  └─ storybook/   Storybook 10: stories from packages/* and app slices
├─ packages/
│  ├─ domain/      @yeral/domain    types, Ashgabat time, booking rules, phone, ids. Pure TS, zero deps, DOM-free
│  ├─ contract/    @yeral/contract  zod schemas of everything on the wire: DTOs, inputs, enums, error codes
│  ├─ sdk/         @yeral/sdk       typed API client (Hono RPC), ApiError, query keys, queryOptions, mutations, events poller
│  ├─ i18n/        @yeral/i18n      use-intl setup, shared messages (ru, tk), formatters
│  ├─ ui/          @yeral/ui        design system: tokens, base styles, components (Radix + cva), cn(). No domain, no text
│  ├─ entities/    @yeral/entities  cross-app entity UI (status badge, staff avatar, price…) — when a 2nd app needs it
│  ├─ features/    @yeral/features  cross-app user actions (phone login…)                   — when a 2nd app needs it
│  ├─ lib/         @yeral/lib       framework-free helpers: .ics, maps/tel links, safe storage, env parsing, site config
│  └─ config/      @yeral/config    tsconfig bases, ESLint, Prettier, Steiger, Vitest presets
├─ infra/
│  ├─ docker/      Dockerfiles per deployable, compose.yml (production-like), compose.dev.yml (Postgres for local work)
│  └─ nginx/       nginx.conf + one server block per host, TLS, caching, security headers
├─ turbo/generators/  `pnpm gen` templates: ui-component, slice, endpoint, app
├─ docs/           memory-bank/ (+ log/), decisions/, API.md
├─ .claude/        skills/, agents/, settings.json
├─ .github/        workflows/, renovate.json, ISSUE_TEMPLATE/
├─ .changeset/
└─ AGENTS.md · CLAUDE.md · turbo.json · pnpm-workspace.yaml (catalog) · package.json · lefthook.yml · .node-version
```

### Package dependency rules

```
config      ← everything (dev only)
lib         ← anything                                   (imports nothing internal)
domain      ← contract, i18n, entities, features, api, apps
contract    ← sdk, entities, features, api, apps
sdk         ← entities, features, landing, client, business, cms   (type-only import of AppType from api)
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
| `app/` | entry, providers, router, `routes/` (file-based, thin), global styles | `routes/$slug.tsx` → loader + head + `SalonPage` |
| `pages/` | one slice per screen; composes everything below | `pages/salon`, `pages/booking`, `pages/account-bookings` |
| `widgets/` | large blocks used by 2+ pages | `widgets/header`, `widgets/salon-map` |
| `features/` | one user action with business value | `features/toggle-favorite`, `features/cancel-booking`, `features/pick-slot` |
| `entities/` | app-specific views of a business object | `entities/salon` (`SalonCard`), `entities/booking` (`BookingRow`) |
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
- Enforced by **Steiger** (`pnpm lint:fsd`) per app and by ESLint import rules. Details: skill `fsd`, ADR 0004.

## Data flow

```
component ─► useQuery(sdk.salons.detail(slug)) ─► hc client ─► GET api.yeral.app/v1/salons/:slug
                                                                 │ zod validates input
                                                                 ▼
                                   module route → service (@yeral/domain rules) → Drizzle repository → Postgres
```

- Components never call `fetch` or the client directly: they use `queryOptions` / mutation options from `@yeral/sdk`
  (or a slice's `api/` segment that wraps them).
- Mutations invalidate by query keys defined in `@yeral/sdk`; optimistic updates only where instant feedback matters.
- **Live updates**: the api writes an event per change (`booking.confirmed`, `booking.created` …) to an `events` table.
  While a screen is open the sdk polls `GET /v1/events?after=<cursor>` (≈10 s, on window focus, and after the user's own
  mutations) and invalidates the matching queries. A push channel can replace polling on the own server; screens don't change.

## State

One owner per kind of state (ADR 0011): server data → TanStack Query; anything a link should restore → router search
params (zod); unsaved form input → TanStack Form; one subtree → `useState`; client-only state shared by distant components
→ a Zustand store in the owning slice's `model/`; changes made elsewhere → events → query invalidation. No global store.

## Rendering

| App | Mode | Notes |
|---|---|---|
| landing | prerendered at build (static files) | unknown single-segment path → `301 client.<domain>/{slug}`; salon slugs can't use reserved landing paths |
| client | SSR for home, search, salon, category/district pages; `ssr: false` for account, booking, login | loaders `ensureQueryData` → dehydrated into the page; `head()` gives title, description, canonical, hreflang, OG, JSON-LD |
| business, cms, storybook | static SPA, `index.html` fallback | `noindex` |

## Backend (`apps/api`)

```
apps/api/src/
  app.ts            OpenAPIHono, middleware (request id, logging, CORS for configured sites, auth session, error mapper), /v1
  modules/<name>/   routes.ts (createRoute + handler) · service.ts (use cases) · repo.ts (Drizzle queries)
                    auth · catalog · availability · bookings · reviews · favorites · notifications · events
                    biz/{calendar, requests, clients, services, team, rules, hours, reviews, analytics, settings} · admin/*
  db/               schema/*.ts (Drizzle), migrations/ (SQL), seed/ (24 demo salons, synthetic occupancy overlay)
  jobs/             runDueJobs(): reminders, expiring requests, notifications
  ports/            sms (dev: code 1234 logged), files (S3 API), clock
  config.ts         one place that reads env on Workers (c.env) and Node (process.env)
  entry/worker.ts · entry/node.ts
```

- Services hold the rules; routes only validate, authorise, call a service and map the result to contract DTOs.
- OpenAPI 3.1 is generated from the routes and served at `/docs` (Scalar).
- Double booking: Postgres exclusion constraint on staff × time range for active bookings + the domain check → `409 slot_taken`.
- Demo behaviour (code `1234`, salons that answer by themselves, synthetic occupancy) is on outside production only.

## Auth

- Client and business: phone + one-time code (Better Auth phone plugin) → httpOnly session cookie on the parent
  domain (`SameSite=Lax`, `Secure`). One person can be a client and a salon member at once; business access = membership
  in a salon (Better Auth organization) with a role: owner, admin, master, reception.
- CMS: separate staff accounts and cookie, two-factor, plus Cloudflare Access in front of `cms.` now (IP allow-list or VPN on the own server).
- Mutations check `Origin` against the configured sites. Mobile apps (later) use bearer tokens.

## Configuration, domains and brand

- `@yeral/lib/site` reads one config per environment: site URLs (landing, client, business, cms, api, storybook),
  cookie domain, brand name key. Apps and api never hard-code `yeral.app`.
- The brand name is an i18n message (`common.brand`); logos live in `@yeral/ui/brand`. A rename = env + messages + logo files.
- Every app serves `/version.json` (`{ app, version, commit, builtAt }`).

## i18n

- `use-intl` (the framework-free core of next-intl): today's `useTranslations` calls and ICU messages carry over.
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
- Portable code only (ADR 0007): web-standard APIs, no Cloudflare-only storage for product data.
