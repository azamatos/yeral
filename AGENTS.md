# Yeral — instructions for coding agents

Ýeral ("ýer al", take a place): booking for any business that sells its time — salons, dentists, restaurants, gyms,
tutors, mechanics and more — launching in Turkmenistan. One monorepo for the client marketplace (yeral.app), the
business workspace, the CMS, the api and the design system (Storybook). Applies to every agent tool; Claude Code also reads `CLAUDE.md`.

**Migration in progress:** the monorepo foundation is in place (M0); the live marketplace is still the frozen Next.js app
in `apps/legacy`, deployed to yeral.app. Status and milestones: `docs/memory-bank/progress.md`.

## Read first

1. `docs/memory-bank/activeContext.md`: current focus, open questions, next steps.
2. `docs/memory-bank/systemPatterns.md` before writing code: monorepo map, FSD, data flow, state, rendering, auth, i18n.
3. As the task needs: `productContext.md` (product rules, glossary), `techContext.md` (libraries, why, where shared
   helpers live), `operations.md` (environments, Docker, CI/CD, versioning, parallel work), `docs/decisions/` (ADRs).
4. **Design source: `docs/design/`** — web design v0.3 (14.10.2026): `README.md` (product spec), `CLAUDE.md` (design
   rules, how to read `.dc.html`), `tokens.css`, `screens/` (hi-fi screens + index), `demo-data.json`. The screen wins on
   visuals, the design README on behaviour. Where `docs/design/CLAUDE.md` suggests a stack (Next.js, CSS Modules,
   next-intl), this repo's ADRs win: TanStack, Tailwind mapped from `tokens.css`, use-intl. Business and CMS screens
   aren't designed yet.

## Rules

1. Place code by Feature-Sliced Design; a package never imports an app (ADR 0004).
2. State has one owner: server data → TanStack Query via `@yeral/sdk`; shareable → URL search params; form input →
   TanStack Form; local → `useState`; shared client-only → a Zustand store in the owning slice (ADR 0011).
3. UI talks to the API only through `@yeral/sdk`. No `fetch` in components.
4. No user-visible string in code, `aria-label` included: i18n in `tk` (default, verbatim from the screens), `ru`, `en`.
   No city names in copy.
5. Business dates/times through `@yeral/domain/time` (business-local, `Asia/Ashgabat` today; `YYYY-MM-DD`, minutes).
   Money = whole manats, shown `40 TMT`.
5a. UI follows `docs/design`: exact values from the screens, nothing invented; anything undrawn follows the nearest
   drawn pattern (design `CLAUDE.md` → "When something isn't drawn"); ask about the design's open questions.
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
- `docs/design/` is the owner's export: read it, don't edit it (a new export replaces the folder). The old mobile designs
  were removed on purpose (2026-10-14); don't restore them.
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
