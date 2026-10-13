# Yeral — instructions for coding agents

Online booking for beauty and wellness salons in Turkmenistan. One monorepo for the landing, client, business and cms
sites, the api and the design system (Storybook). Applies to every agent tool; Claude Code also reads `CLAUDE.md`.

**Migration in progress:** the architecture is agreed (`docs/decisions`), but the live code is still the Next.js
marketplace in `src/`, deployed to yeral.app. Status and milestones: `docs/memory-bank/progress.md`.

## Read first

1. `docs/memory-bank/activeContext.md`: current focus, open questions, next steps.
2. `docs/memory-bank/systemPatterns.md` before writing code: monorepo map, FSD, data flow, state, rendering, auth, i18n.
3. As the task needs: `productContext.md` (product rules, glossary), `techContext.md` (libraries, why, where shared
   helpers live), `operations.md` (environments, Docker, CI/CD, versioning, parallel work), `docs/decisions/` (ADRs).
4. Design source: the Claude Design export (Design System v2, Client App, Business App, decks) at
   `/Users/azamatos/www/yeral/design` on the owner's machine, not in the repo yet.

## Rules

1. Place code by Feature-Sliced Design; a package never imports an app (ADR 0004).
2. State has one owner: server data → TanStack Query via `@yeral/sdk`; shareable → URL search params; form input →
   TanStack Form; local → `useState`; shared client-only → a Zustand store in the owning slice (ADR 0011).
3. UI talks to the API only through `@yeral/sdk`. No `fetch` in components.
4. No user-visible string in code, `aria-label` included: i18n with Russian plural forms.
5. Salon dates/times through `@yeral/domain/time` (`Asia/Ashgabat`, `YYYY-MM-DD`, minutes). Money = whole manats.
6. Domains, cookie domain and brand name come from config (`@yeral/lib/site`); never hard-code `yeral.app`.
7. Portable code only: web-standard APIs; no Cloudflare-only storage for product data; every deployable has a Dockerfile (ADR 0007).
8. UI components live in `@yeral/ui` with Storybook stories for every variant; scaffold with `pnpm gen ui-component` (ADR 0012).
9. Tests come with the change: domain rule → unit test; component → stories; endpoint → API test; bug fix → a failing test first (ADR 0013).
10. Check "Where shared things live" in `techContext.md` before writing a helper; add new shared helpers there.
11. User-visible change → `pnpm changeset`. Commits and PR titles: Conventional Commits, scope = app or package.
12. Architecture, core library or process change → ADR + memory-bank update in the same commit.

## Working with the owner

- The owner writes in English; the product UI is Russian (Turkmen next).
- Finished work: commit, push and deploy to staging without asking. Production comes from releases.
  Until M0 there's no staging: `pnpm run deploy` publishes straight to yeral.app, so say so when doing it.
- Ask first before: repository settings, DNS changes, deleting anything in the Cloudflare or GitHub account, paid services,
  adding files from outside the repo.
- Never ask for tokens or passwords in chat. The owner signs in with `gh auth login` / `npx wrangler login`, or stores
  secrets with `gh secret set NAME`.

## Parallel work (ADR 0014)

- Take a task from GitHub Issues; claim it with the label `agent:<name>`; stay inside the scope it lists.
- Work in your own git worktree and branch (`feat/<issue>-<topic>`), never on `main`. Set `PORT_BASE` (3100, 3200…)
  and use your own database (`pnpm db:setup`).
- Hot spots (`packages/contract`, `packages/ui` tokens, the dependency catalog, `turbo.json`, root configs, migrations):
  small separate PRs, announced on the issue.
- Don't edit `activeContext.md` or `progress.md` during parallel work: add `docs/memory-bank/log/YYYY-MM-DD-<topic>.md`
  and a handoff section in the PR.
- Merge only through a PR with green CI, rebased on `main`.

## Commands

Today (Next app at the repo root): `pnpm dev` · `pnpm lint` · `pnpm typecheck` · `pnpm run deploy`

After M0: `pnpm dev` · `pnpm dev --filter=client...` · `pnpm gen <generator>` · `pnpm lint` · `pnpm lint:fsd` ·
`pnpm typecheck` · `pnpm test` · `pnpm e2e` · `pnpm db:up` · `pnpm db:setup` · `pnpm docker:up` · `pnpm changeset`

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
