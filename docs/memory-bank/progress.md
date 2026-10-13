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

- **2026-10-13 · M0 monorepo foundation** (branch `chore/m0-monorepo`): pnpm 12 workspace with a dependency catalog and
  `allowBuilds`; Turborepo tasks (`build lint lint:fsd typecheck test dev deploy`); `@yeral/config` (tsconfig bases,
  ESLint 10 flat preset, Prettier with Tailwind class sorting, Vitest preset, with type declarations); `pnpm gen package`;
  lefthook (format staged files, commitlint); Changesets (private packages versioned and tagged); GitHub Actions `ci.yml`,
  `release.yml`, `deploy.yml` + `scripts/smoke.sh`; `/version.json` stamp; Renovate config; issue and PR templates;
  `PORT_BASE`; `AGENTS.md` for every agent tool. The Next app moved to `apps/legacy` (`@yeral/legacy`) and builds, previews
  and deploys from the monorepo. First tests: 45 Vitest cases for the booking rules, which found and fixed a bug (yearly
  closures across New Year were ignored).

**The owner is not satisfied with the first client app.** It gets rebuilt and polished in M3 on the new foundation.
Before that, collect the owner's specific complaints and review it against DS v2 and Fresha.
Not click-tested in the Next app: cancel dialog, move flow, review post/edit, favourites and profile pages,
notification click-through, booking confirmation on a phone.

## Roadmap

Infrastructure first (owner, 2026-10-13). Each milestone ends merged, deployed to staging, memory bank updated.

| # | Milestone | Scope | Done when |
|---|---|---|---|
| M0 ✅ | **Monorepo foundation** | pnpm 12 workspace + catalog; Turborepo + generators; `@yeral/config` (tsconfig, ESLint, Prettier, Steiger, Vitest presets); lefthook + commitlint; Changesets; `ci.yml`, `release.yml`, `deploy.yml`; Renovate; issue templates + Project board; `PORT_BASE`; `AGENTS.md`; the Next app moved to `apps/legacy`, still serving `yeral.app` | `pnpm i && pnpm build && pnpm lint` green locally and in CI; legacy deploys from CI |
| M1 | **Design system** | `@yeral/ui`: DS v2 tokens, base styles, components rebuilt on Radix/shadcn + cva (button, icon button, input, phone input, select, checkbox, switch, chip, tag, badge/status, avatar, rating, skeleton, empty state, dialog/sheet, popover, menu, tabs, tooltip, toast, form fields with `useAppForm`, date rail, time chips); `apps/storybook` deployed to `storybook.yeral.app`; Vitest browser tests: interactions, a11y, screenshots | every component has stories for all variants; CI runs them; Storybook live |
| M2 | **Platform** | `@yeral/domain` (+ unit tests), `@yeral/contract`, `@yeral/i18n`, `@yeral/lib` (site config), `@yeral/sdk`; `apps/api`: Drizzle schema + migrations + seed, Better Auth (phone, dev code), catalog, availability, bookings, reviews, favorites, notifications, events, jobs; OpenAPI docs; Dockerfiles + Compose + nginx; api on Cloudflare with Neon | every endpoint in `docs/API.md` works on Postgres with tests; `pnpm docker:up` serves the stack locally |
| M3 | **Client app** | rebuilt with TanStack Start + FSD on `@yeral/sdk` and `@yeral/ui`; polished with the owner's feedback; SSR public pages with `head()`; Playwright suite; `client.yeral.app` | the owner signs it off; booking flows green in Playwright; link previews work |
| M4 | **Landing** | `yeral.app`: «Я клиент» / «Я бизнес», search box, for-business pricing and sign-up entry, short-link redirects; apex moves from legacy to landing; `apps/legacy` deleted | `yeral.app/nozhnitsy` → client app; legacy gone |
| M5 | **Business app** | phone login + salon switcher; calendar (staff columns, day / 3 days / week load, drag and drop: proposal for app clients, move for phone clients, side drawer); requests; manual booking; clients; services; team and schedules; booking rules; hours and exceptions; reviews and answers; analytics MVP; settings; notifications; PWA | e2e: client books → business confirms → client sees it |
| M6 | **CMS** | staff accounts, salon onboarding and moderation, users, complaints and no-shows, categories and districts, content (landing texts, banners, SEO texts), Cloudflare Access | the team can onboard a salon end to end |
| M7 | **Turkmen + SEO** | `tk` messages, locale in URLs, hreflang, city × category pages, sitemap, OG images, client PWA | both languages complete; sitemap valid |
| M8 | **Own server** | when the owner buys it: reachability test from Ashgabat, Compose stack live, data moved from Neon/R2, DNS switched, CI deploys over SSH; production SMS gateway and push | the sites open in Ashgabat without a VPN |
