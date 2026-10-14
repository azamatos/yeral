# Tech context

Versions checked on npm on 2026-10-13. Every dependency is pinned once in `pnpm-workspace.yaml` (`catalog:`) and
referenced as `"catalog:"` from packages, so all apps run the same versions. Status: *planned* until the milestones in
`progress.md` land; the live Next.js app uses a subset. The "why" for the big choices is in `docs/decisions`.

## Foundation

| Tool | Version | Why | Instead of |
|---|---|---|---|
| Node.js | 24 LTS | tooling, SSR and api in Docker; pinned in `.node-version` | 26 once it becomes LTS |
| pnpm | 12 | workspaces; strict `node_modules` (an undeclared import fails); catalogs pin one version per dependency | npm, yarn (no strictness), Bun (edge cases in tooling) |
| Turborepo + @turbo/gen | 2.11 | task graph (packages before apps), local and CI cache, `--affected`; generators for consistent scaffolding | Nx: more than we need, heavier config |
| TypeScript | 6.0 | strict; typescript-eslint supports `< 6.1` today | 7.0 (native, much faster) once typescript-eslint supports it |
| Vite | 8 | dev server and build for every frontend; Storybook, Vitest and TanStack Start all run on it, so one config world | webpack / Rspack |
| React | 19.3 + React Compiler 1.0 | compiler (via `@rolldown/plugin-babel`) memoises for us; rules-of-React lint | — |

## Frontend

| Library | Version | Why | Instead of |
|---|---|---|---|
| TanStack Start | 1.169 | SSR for the client site: explicit loaders and `head()`, SSR on/off per route, builds for Cloudflare or Node | Next.js (ADR 0002), React Router 7, Astro |
| TanStack Router | 1.170 | typed routes and zod-validated search params: filters, wizard and calendar live in the URL | React Router (weaker search-param typing) |
| TanStack Query + router SSR integration | 5.104 / 1.167 | server state: cache, de-dupe, refresh, invalidation, optimistic updates, SSR hydration | SWR (fewer features), RTK Query (needs Redux) |
| TanStack Form | 1.33 | typed forms with zod validators; compiler-friendly; `createFormHook` binds our field components | React Hook Form (ADR 0011) |
| Zustand | 5 | small client-only stores in a slice's `model/` (calendar, selection) | Redux, Jotai, MobX (ADR 0011) |
| zod | 4.6 | one schema language: API input/output, forms, search params, env | valibot, arktype (smaller ecosystem around forms/OpenAPI) |
| use-intl | 4.14 | ICU messages and typed keys for `tk`, `ru`, `en` (ADR 0016) | Paraglide, i18next, Lingui (ADR 0008) |
| Tailwind CSS | 4.3 | `docs/design/tokens.css` mapped one to one into `@theme` (same names); exact design values; no runtime CSS-in-JS | CSS Modules (the design's suggestion), vanilla-extract, Panda |
| Onest (`@fontsource-variable/onest`) | 5 | the design's font, self-hosted (latin, latin-ext, cyrillic, cyrillic-ext): Turkmen letters + Cyrillic, no Google Fonts request | Google Fonts link |
| class-variance-authority + tailwind-merge + clsx | 0.7 / 3.7 / 2.1 | component variants; `cn()` merges classes so a passed `className` wins | tailwind-variants (fine too; cva matches shadcn output) |
| Radix UI (`radix-ui`) | 1.8 | accessible primitives: dialog, popover, menu, select, tabs, tooltip | Base UI (newer), React Aria (heavier API) |
| shadcn CLI | 4 | scaffolds Radix components into `@yeral/ui`; we own and restyle the code | ready-made kits (MUI, Mantine) that fight the design |
| lucide-react | 1.56 | icons, stroke 1.75 (design system) | — |
| sonner | 2 | toasts | our hand-rolled toast |
| TanStack Table / Virtual | 9 / 3 | data tables and long lists in business and cms | AG Grid (heavy) |
| react-day-picker | 10 | date pickers in business and cms | — |
| dnd-kit (`@dnd-kit/core`) | 6.3 | calendar drag and drop; re-check `@dnd-kit/react` (0.x) at the business milestone | pragmatic-drag-and-drop |
| Recharts | 3 | analytics charts | visx (lower level), ECharts (heavy) |
| MapLibre GL | 6 | maps, restyled to the design; OpenFreeMap tiles now (owner's decision 2026-10-14), self-hosted tiles on the own server | Google, Yandex (keys, billing, third-party scripts) |

## Backend

| Tool | Version | Why | Instead of |
|---|---|---|---|
| Hono + @hono/node-server | 4.13 / 2.1 | one `fetch` handler that runs on Workers now and Node in Docker later; typed RPC client | Fastify/Express (Node only), NestJS (heavy) |
| @hono/zod-openapi + @scalar/hono-api-reference | 1.6 / 0.12 | routes declared with zod → validation + OpenAPI 3.1 + docs page | hand-written OpenAPI |
| PostgreSQL | 18 | relational data, exclusion constraints against double booking, full-text search | D1/SQLite (ADR 0005) |
| Neon | — | managed Postgres while on Cloudflare: free tier, a branch per environment, reached through Hyperdrive | Supabase (extras we don't need) |
| Drizzle ORM / drizzle-kit | 0.45 / 0.31 | TypeScript schema, SQL-like queries, SQL migrations in git, runs on Workers and Node | Prisma 7, Kysely |
| postgres (postgres.js) | 3.4 | driver for Drizzle on both runtimes | Neon-specific driver |
| Better Auth | 1.7 | phone + one-time code, sessions in Postgres, organizations = salons with roles and invitations | hand-rolled sessions |
| jobs table + `runDueJobs()` | — | reminders and expiry without a queue service; Cron Trigger now, a container loop later | pg-boss (needs a long-running process) |
| pino | 10 | structured logs on Node | — |

## Quality and tests

| Tool | Version | Role |
|---|---|---|
| ESLint | 10 | flat config in `@yeral/config`: typescript-eslint 8 (type-aware), react-hooks 7 (incl. compiler rules), TanStack Query/Router plugins |
| Steiger + @feature-sliced/steiger-plugin | 0.7 / 0.8 | FSD rules per app (`pnpm lint:fsd`) |
| Prettier + prettier-plugin-tailwindcss | 3.9 / 0.8 | formatting and class order (Biome is faster but lacks the compiler/TanStack lint rules) |
| Vitest | 5 | unit tests; browser mode (`@vitest/browser-playwright`) for component tests and screenshots |
| Storybook + addon-vitest, addon-a11y | 10.6 | design-system docs; stories run as tests (interactions, a11y, screenshots) |
| MSW + msw-storybook-addon | 3.0 | contract-shaped API mocks in stories and component tests |
| Playwright | 1.64 | end-to-end flows across apps (several origins in one test) |
| lefthook | 2 | git hooks: format + lint staged files, commit message check |
| commitlint | 21 | Conventional Commits |
| Changesets + @changesets/changelog-github | 3 / 1 | versions and changelogs per app and package |
| Renovate | — | grouped dependency PRs |

## Infrastructure

| Tool | Why |
|---|---|
| Cloudflare Workers + wrangler 4 | hosting now: static assets, SSR, api; custom domains created on deploy |
| Hyperdrive, R2, Cron Triggers, Access | Postgres connection pooling, photo storage (S3 API), the jobs tick, gate in front of the CMS |
| Docker + Compose | the production-like stack and the future server: one image per deployable (`turbo prune --docker`, multi-stage) |
| nginx (official image) | the future server's front door: TLS (Let's Encrypt), reverse proxy to Node services, static apps, caching, headers |
| GitHub Actions + GHCR | CI/CD; container registry for the server phase |
| Sentry (free tier, `@sentry/react`, `@sentry/cloudflare`) | error tracking now; self-host or tunnel later if needed |
| Cloudflare Web Analytics | privacy-friendly page analytics now; Umami on the own server later |

## Where shared things live

| Need | Use | From |
|---|---|---|
| class names | `cn()` | `@yeral/ui/cn` |
| business today / now, date maths | `today() nowMin() addDays() diffDays() dow() parseYmd() hm()` | `@yeral/domain/time` |
| availability and statuses | `freeSlots() salonSlots() nextFree() openState() viewStatus() cancelDeadline()` | `@yeral/domain/rules` |
| `+993` phones | `normPhone() fmtPhone()` | `@yeral/domain/phone` |
| ids | `uid()` | `@yeral/domain/id` |
| money, dates, durations, relative days on screen | `useFmt()` (`money price dur dayMonth when whenInline relDay …`) | `@yeral/i18n` |
| site URLs, cookie domain, brand | `site` | `@yeral/lib/site` |
| add to calendar | `buildIcs() downloadIcs()` | `@yeral/lib/ics` |
| directions, call | `directionsUrl() telHref()` | `@yeral/lib/links` |
| local/session storage that never throws | `safeStorage` | `@yeral/lib/storage` |
| env vars | `parseEnv(schema)` → `shared/config/env.ts` per app | `@yeral/lib/env` |
| API data | `sdk.<resource>.<query>()` queryOptions, `sdk.<resource>.<action>()` mutation options | `@yeral/sdk` |
| forms | `useAppForm()` with `TextField`, `PhoneField`, `SelectField` … | `@yeral/ui/form` |

Before writing a helper, look here and in the package; add new shared helpers to the right package and to this table.

## Code conventions

- TypeScript `strict` + `noUncheckedIndexedAccess`; no `any`; `unknown` + zod at every boundary (API, URL, storage, env).
- Files kebab-case (`booking-card.tsx`); components PascalCase; hooks `useX`; zod schemas `xSchema` with `type X = z.infer<…>`.
- Named exports only (route files export `Route`, as TanStack expects).
- Prettier: no semicolons, single quotes, `printWidth` 140, trailing commas.
- Comments explain a non-obvious *why*; product rules name their source (design spec section, ADR).
- No user-visible string in code, `aria-label` included: everything through i18n.
- Mobile first: works at 360 px wide, touch targets ≥ 40 px, keyboard and screen reader friendly.
- Imports: packages by name and subpath (`@yeral/ui/button`); inside an app via `@/` = `src/`.
- Tests sit next to the code (`rules.test.ts`, `button.stories.tsx`).

## Local development

```bash
pnpm install
pnpm db:up && pnpm db:setup     # (M2) Postgres in Docker, database for this worktree, migrations + seed
pnpm dev                        # api + all apps + Storybook through turbo
pnpm dev --filter=@yeral/client...  # one app and what it depends on
pnpm gen package                # scaffold an internal package; ui-component (M1), slice (M3), endpoint (M2) follow
pnpm check                      # lint, FSD lint, types, tests, format — same as CI
pnpm e2e                        # (M3) Playwright against the local stack
pnpm docker:up                  # (M2) production-like stack (nginx + images) on *.yeral.localhost
pnpm changeset                  # describe a user-visible change
```

| client | business | cms | api | storybook | — |
|---|---|---|---|---|---|
| :3000 (:3001 while legacy lives) | :3002 | :3003 | :3004 (`/docs`) | :3005 | |

Ports are `PORT_BASE` + offset (`PORT_BASE=3100` in a second worktree). Cookies on `localhost` are shared across ports,
so one login works in every app locally.

**Today**: `pnpm dev` runs `apps/legacy` on :3000. `apps/client` takes :3000 when it replaces legacy (end of M3); until
then it runs on :3001 next to legacy.
`pnpm --filter @yeral/legacy run deploy` builds with OpenNext and publishes to Cloudflare by hand (fallback to the release flow).
