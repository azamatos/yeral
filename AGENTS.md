# Yeral — instructions for coding agents

Online booking for beauty and wellness salons in Turkmenistan. One monorepo for the landing, client, business and cms
sites, the api and the design system (Storybook). Applies to every agent tool; Claude Code also reads `CLAUDE.md`.

**Migration in progress:** the monorepo foundation is in place (M0); the live marketplace is still the frozen Next.js app
in `apps/legacy`, deployed to yeral.app. Status and milestones: `docs/memory-bank/progress.md`.

## Read first

1. `docs/memory-bank/activeContext.md`: current focus, open questions, next steps.
2. `docs/memory-bank/systemPatterns.md` before writing code: monorepo map, FSD, data flow, state, rendering, auth, i18n.
3. As the task needs: `productContext.md` (product rules, glossary), `techContext.md` (libraries, why, where shared
   helpers live), `operations.md` (environments, Docker, CI/CD, versioning, parallel work), `docs/decisions/` (ADRs).
4. Design source: `docs/design/` — the Claude Design export (Design System v2, Client App, Business App, Business
   Clients and Analytics, Product and Business decks, Project Brief). Open the `.dc.html` files in a browser.

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
- `docs/design/` is the owner's export: read it, don't edit it (a new export replaces the folder).
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

Every task runs through Turborepo from the root; `--filter=@yeral/<name>...` narrows it to one package and its dependencies.

| Command | Does |
|---|---|
| `pnpm dev` | all dev servers (`PORT_BASE` + offset, legacy on +0) |
| `pnpm check` | lint, FSD lint, types, tests, format check — run before every PR |
| `pnpm build` · `pnpm lint` · `pnpm typecheck` · `pnpm test` | one task across the workspace |
| `pnpm format` | Prettier on everything except `apps/legacy`, `docs/design` and Markdown |
| `pnpm gen package` | scaffold an internal package (more generators arrive with M1–M3) |
| `pnpm changeset` | describe a user-visible change for the next release |

Planned with later milestones: `pnpm e2e`, `pnpm db:up`, `pnpm db:setup`, `pnpm docker:up`, `pnpm gen ui-component|slice|endpoint`.
