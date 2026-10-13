# Progress and roadmap

## Done

- **2026-10-13 · Phase 0 + 1 (Next.js):** client marketplace on mock data: home, search with map and day rail, salon pages
  with JSON-LD, full-page booking wizard, phone login, my bookings and booking detail (cancel, move, proposal,
  review, «это не я»), favourites, profile, notifications, demo panel playing the salon. Live at https://yeral.app
  (Cloudflare Worker `yeral-web`, www → apex). Commits `3906655`, `f536f22`.
- **2026-10-13 · Architecture agreed:** monorepo, four sites, TanStack, FSD, TypeScript backend, portable hosting.
  This memory bank and ADRs 0001–0010.

Not click-tested yet in the Next app (re-test after the port): cancel dialog, move flow, posting and editing a review,
favourites and profile pages, notification click-through, booking confirmation on a phone.

## Roadmap

Each milestone ends deployed to staging, with the memory bank updated. Order can change; M8's host decision can happen at any time.

| # | Milestone | Scope | Done when |
|---|---|---|---|
| M0 | **Monorepo skeleton** | pnpm 12 workspace + catalog, Turborepo, `@yeral/config` (tsconfig, ESLint, Prettier, Steiger), lefthook + commitlint, Changesets, `ci.yml`, Renovate. The current Next app moves to `apps/legacy` unchanged and keeps serving `yeral.app` | `pnpm i && pnpm build` green locally and in CI; legacy deploys from the monorepo |
| M1 | **Shared packages** | `@yeral/domain` (port + unit tests for the rules), `@yeral/contract` (zod from today's `contract.ts`), `@yeral/i18n` (use-intl, messages split into shared and per-app), `@yeral/ui` (tokens, cva variants, Radix/shadcn primitives in DS v2), `@yeral/lib` | packages typecheck, rules covered by tests |
| M2 | **API (demo)** | `apps/api`: Hono modules for every endpoint in `docs/API.md`, demo store ported from the mock (seed, synthetic occupancy, auto-answering salons), demo worlds, SSE events, OpenAPI at `/docs`; `@yeral/sdk` with queryOptions; deployed to `api-stage` | each endpoint answers per the contract; API tests pass |
| M3 | **Client app** | marketplace ported to TanStack Start + FSD on `@yeral/sdk`; SSR public pages with `head()`; full QA of the untested flows; `client.yeral.app` | Playwright booking suite green; salon link shows a preview card in messengers; parity with the live site |
| M4 | **Landing** | `yeral.app`: «Я клиент» / «Я бизнес», search box, for-business pricing and sign-up entry, short-link redirects; apex moves from legacy to landing; `apps/legacy` deleted | `yeral.app/nozhnitsy` → client app; legacy gone |
| M5 | **Business app** | phone login + salon switcher; calendar (staff columns, day / 3 days / week load, drag and drop: proposal for app clients, move for phone clients, side drawer); requests; manual booking; clients; services; team and schedules; booking rules; hours and exceptions; reviews and answers; analytics MVP; settings; notifications; PWA | e2e: client books → business confirms → client sees it without reloading |
| M6 | **CMS** | staff accounts, salon onboarding and moderation, users, complaints and no-shows, categories and districts, content (landing texts, banners, SEO texts), demo world reset | the team can onboard a salon end to end |
| M7 | **Turkmen + SEO** | `tk` messages, locale in URLs, hreflang, city × category pages, sitemap, OG images, client PWA | both languages complete; sitemap valid |
| M8 | **Production hosting** | host chosen after the Turkmenistan test; Docker images; self-hosted map tiles; error tracking; analytics; uptime checks | the sites open in Ashgabat without a VPN |
| M9 | **Real backend** | Postgres + Drizzle store, SMS codes, sessions and roles, jobs (reminders, expiring requests), web push, migrations, backups; production api leaves demo mode (demo stays on staging) | a real salon takes real bookings |
