# Yeral

Online booking for beauty and wellness salons in Turkmenistan. One monorepo for `yeral.app` (landing),
`client.yeral.app`, `business.yeral.app`, `cms.yeral.app` and `api.yeral.app`.

**Migration in progress:** the architecture below is agreed, but the live code is still the Next.js marketplace in `src/`
(deployed to yeral.app). Milestones and status: `docs/memory-bank/progress.md`.

@docs/memory-bank/activeContext.md

## Read before working

- `docs/memory-bank/README.md`: index of the project memory.
- `systemPatterns.md` before writing code (monorepo map, FSD, data flow, state, rendering, auth, i18n, conventions).
- `productContext.md` for product rules and the glossary; `techContext.md` for libraries and where shared helpers live;
  `operations.md` for environments, CI/CD, versioning, hosting.
- `docs/decisions/`: why things are the way they are (ADRs).
- Design source: `../design/*.dc.html` next to the repo (Design System v2, Client App, Business App, decks). It's not in the repo on purpose.

## Rules

1. Place code by Feature-Sliced Design (skill `fsd`). A package never imports an app.
2. UI gets data only through `@yeral/sdk` (queryOptions, mutations). No `fetch` in components.
3. No user-visible string in code, `aria-label` included: i18n (skill `i18n`).
4. Salon dates and times through `@yeral/domain/time` (`Asia/Ashgabat`, dates `YYYY-MM-DD`, times in minutes). Money = whole manats.
5. No third-party hosts at runtime: no Google Fonts, CDNs, external analytics or tiles in production (ADR 0007).
6. Before writing a helper, check "Where shared things live" in `techContext.md`; add new shared helpers there.
7. A user-visible change gets a changeset (`pnpm changeset`); commits and PR titles follow Conventional Commits with the app or package as scope.
8. A change to architecture, a core library or a process gets an ADR and a memory-bank update in the same commit.
9. End of a work session: skill `memory-bank`.

## Working with the owner

- The owner writes in English; the product UI is Russian (Turkmen next).
- Finished work: commit, push and deploy to staging without asking. Production comes from releases (skill `release`).
  Until M0 there is no staging: `pnpm run deploy` publishes straight to yeral.app, so say so when doing it.
- Ask first before: repository settings or visibility, DNS changes, deleting anything in the Cloudflare or GitHub account, paid services.
- Never ask for tokens or passwords in chat. The owner signs in with `gh auth login` / `npx wrangler login`, or stores
  secrets with `gh secret set NAME`.

## Commands

Today (Next app at the repo root): `pnpm dev` · `pnpm lint` · `pnpm typecheck` · `pnpm run deploy`

After M0: `pnpm dev` · `pnpm dev --filter=client...` · `pnpm lint` · `pnpm lint:fsd` · `pnpm typecheck` · `pnpm test` ·
`pnpm e2e` · `pnpm changeset`

## Project skills (`.claude/skills`)

`fsd` (where code goes) · `api-endpoint` (contract → api → sdk) · `i18n` (strings, plurals, formats) ·
`ui-component` (design system) · `qa-flows` (browser click-through) · `release` (changesets, deploy, rollback) ·
`memory-bank` (keep the project memory current)
