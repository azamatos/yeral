# Tech context

Versions checked on npm on 2026-10-13. Every dependency is pinned once in `pnpm-workspace.yaml` (`catalog:`) and
referenced as `"catalog:"` from packages, so all apps run the same versions. Status: *planned* until the migration
milestones in `progress.md` land; the live Next.js app uses a subset.

## Foundation

| Tool | Version | Why | Instead of |
|---|---|---|---|
| Node.js | 24 LTS | tooling, SSR, API; pinned in `.node-version` | 26 once it becomes LTS |
| pnpm | 12 | workspaces, strict `node_modules` (undeclared imports fail), catalogs | npm, yarn |
| Turborepo | 2.11 | task graph (packages before apps), local and CI cache, `--affected` runs only what changed | Nx: more power than we need, heavier config |
| TypeScript | 6.0 | strict; typescript-eslint supports `< 6.1` today | 7.0 (native, much faster) once typescript-eslint supports it |
| Vite | 8 | dev server and builds for all frontends | Next.js / webpack |
| React | 19.3 + React Compiler 1.0 | compiler (via `@rolldown/plugin-babel`) removes most manual `useMemo`/`useCallback` | |

## Routing, data, API

| Library | Version | Used in | Why |
|---|---|---|---|
| TanStack Start | 1.169 | landing (prerender), client (SSR) | Vite plugin, explicit loaders and `head()`, SSR per route on/off, Node or Cloudflare target, no Server Components |
| TanStack Router | 1.170 | all frontends | typed routes, typed zod-validated search params (wizard and filters live in the URL) |
| TanStack Query | 5.104 | all frontends | server state, cache, SSR dehydration through the router integration |
| Hono | 4.13 | api | small, runs on Node and Workers, typed RPC client (`hc`) |
| @hono/zod-openapi + @scalar/hono-api-reference | 1.6 / 0.12 | api | routes declared with zod → validation + OpenAPI 3.1 + docs page |
| zod | 4.6 | everywhere | one schema language: API input/output, forms, search params, env |

## UI

| Library | Version | Why |
|---|---|---|
| Tailwind CSS | 4.3 | design tokens as `@theme` in `@yeral/ui`; apps `@import` them and `@source` the packages |
| tailwind-merge + clsx → `cn()` | 3.7 / 2.1 | conflict-free class composition |
| class-variance-authority | 0.7 | component variants (`variant`, `size`) |
| Radix UI (`radix-ui`) | 1.8 | accessible primitives: dialog, popover, menu, select, tabs, tooltip |
| shadcn CLI | 4 | scaffolds Radix-based components into `@yeral/ui`; we own and restyle the code to DS v2 |
| lucide-react | 1.56 | icons, stroke 1.75 (design system) |
| sonner | 2 | toasts (replaces the hand-rolled one) |
| React Hook Form + @hookform/resolvers | 7.90 / 5.9 | forms; zod schemas from `@yeral/contract` (TanStack Form is the alternative; RHF has the bigger ecosystem) |
| TanStack Table | 9 | data tables in business and cms |
| TanStack Virtual | 3 | long lists |
| react-day-picker | 10 | date pickers in business and cms |
| dnd-kit (`@dnd-kit/core`) | 6.3 | calendar drag and drop; re-check `@dnd-kit/react` (0.x today) at M5 |
| Recharts | 3 | analytics charts |
| MapLibre GL | 6 | maps; tiles from OpenFreeMap today, self-hosted PMTiles of Turkmenistan before launch |
| Zustand | 5 | rare cross-component UI state |
| use-intl | 4.14 | i18n, ICU messages, same API as today's next-intl code |

## Backend (*planned*, real backend milestone)

| Tool | Version | Why |
|---|---|---|
| PostgreSQL | 18 | main database; exclusion constraint makes double booking impossible |
| Drizzle ORM / drizzle-kit | 0.45 / 0.31 | typed SQL, migrations as SQL files in git |
| Better Auth | 1.7 | phone OTP, sessions, organizations = salons with member roles. To be confirmed against hand-rolled sessions at that milestone |
| pg-boss | 12 | background jobs on Postgres (reminders, expiring requests, notifications); no Redis |
| pino | 10 | structured logs |
| SMS gateway | local, TBD | behind a `Sms` port; the demo prints the code |
| Web Push (VAPID) | | notifications for the business PWA and the client |

## Quality and workflow

| Tool | Version | Role |
|---|---|---|
| ESLint | 10 | flat config in `@yeral/config`: typescript-eslint 8 (type-aware), react-hooks 7 (incl. compiler rules), TanStack Query/Router plugins |
| Steiger + @feature-sliced/steiger-plugin | 0.7 / 0.8 | FSD rules per app (`pnpm lint:fsd`) |
| Prettier + prettier-plugin-tailwindcss | 3.9 / 0.8 | formatting and class order. Biome is faster but would cost us the react-hooks/compiler lint rules |
| Vitest + Testing Library + happy-dom | 5 / 16 / 21 | unit and component tests |
| Playwright | 1.64 | end-to-end flows, including client ↔ business |
| Storybook | 10 | living docs of `@yeral/ui` (from the business milestone) |
| lefthook | 2 | git hooks: format + lint staged files, commit message check |
| commitlint | 21 | Conventional Commits |
| Changesets + @changesets/changelog-github | 3 / 1 | versions and changelogs per app and package |
| Renovate | — | grouped dependency PRs |

**Observability** (*planned*): errors through the Sentry SDK with a `tunnel` to our own endpoint (or self-hosted
GlitchTip, decided with the host); product analytics with self-hosted Umami. No Google Analytics or Tag Manager:
unreliable in Turkmenistan and a third-party runtime host.

## Where shared things live

| Need | Use | From |
|---|---|---|
| class names | `cn()` | `@yeral/ui/cn` |
| salon today / now, date maths | `today() nowMin() addDays() diffDays() dow() parseYmd() hm()` | `@yeral/domain/time` |
| availability and statuses | `freeSlots() salonSlots() nextFree() openState() viewStatus() cancelDeadline()` | `@yeral/domain/rules` |
| `+993` phones | `normPhone() fmtPhone()` | `@yeral/domain/phone` |
| ids | `uid()` | `@yeral/domain/id` |
| money, dates, durations, relative days on screen | `useFmt()` (`money price dur dayMonth when whenInline relDay …`) | `@yeral/i18n` |
| add to calendar | `buildIcs() downloadIcs()` | `@yeral/lib/ics` |
| directions, call | `directionsUrl() telHref()` | `@yeral/lib/links` |
| local/session storage that never throws | `safeStorage` | `@yeral/lib/storage` |
| env vars | `parseEnv(schema)` → `shared/config/env.ts` per app | `@yeral/lib/env` |
| API data | `sdk.<resource>.<query>()` queryOptions, `sdk.<resource>.<action>` mutations | `@yeral/sdk` |

Before writing a helper, look here and in the package; add new shared helpers to the right package and to this table.

## Code conventions

- TypeScript `strict` + `noUncheckedIndexedAccess`; no `any`; `unknown` + zod at every boundary (API, URL, storage, env).
- Files kebab-case (`booking-card.tsx`); components PascalCase; hooks `useX`; zod schemas `xSchema` with `type X = z.infer<…>`.
- Named exports only (route files export `Route`, as TanStack expects).
- Prettier: no semicolons, single quotes, `printWidth` 140, trailing commas.
- Comments explain a non-obvious *why*; product rules name their source (deck, brief, prototype).
- No user-visible string in code, `aria-label` included: everything through i18n.
- Mobile first: works at 360 px wide, touch targets ≥ 40 px, keyboard and screen reader friendly.
- Imports: packages by name and subpath (`@yeral/ui/button`); inside an app via `@/` = `src/`.
- Tests sit next to the code (`rules.test.ts`). `@yeral/domain` rules are covered by unit tests.

## Local development (*planned* monorepo)

```bash
pnpm install
pnpm dev                       # api + all apps through turbo
pnpm dev --filter=client...    # one app and what it depends on
pnpm lint && pnpm lint:fsd && pnpm typecheck && pnpm test
pnpm e2e                       # Playwright against the local stack
pnpm changeset                 # describe a user-visible change
```

| landing | client | business | cms | api |
|---|---|---|---|---|
| :3000 | :3001 | :3002 | :3003 | :8787 (`/docs`) |

Cookies on `localhost` are shared across ports, so one demo login works in every app locally.

**Today (before the migration)**: `pnpm dev` runs the Next.js marketplace; `pnpm run deploy` builds with OpenNext and
publishes to Cloudflare (`yeral.app`).
