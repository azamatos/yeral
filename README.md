# Yeral

Online booking for beauty and wellness salons in Turkmenistan: a client marketplace, a business workspace for salons,
an internal CMS and the API behind them, in one monorepo.

**Status:** monorepo foundation done (M0). The live site https://yeral.app is the first Next.js version in `apps/legacy`;
the new apps replace it milestone by milestone ([roadmap](docs/memory-bank/progress.md)).

## Start here

| | |
|---|---|
| [AGENTS.md](AGENTS.md) | rules and commands for people and coding agents |
| [docs/memory-bank](docs/memory-bank/README.md) | project memory: brief, product rules, architecture, tech, operations, current focus |
| [docs/decisions](docs/decisions/README.md) | why things are the way they are (ADRs) |
| [docs/design](docs/design) | the Claude Design export (Design System v2, Client App, Business App, decks) |

## Run

Node 22.12+ (CI uses 24, see `.node-version`) and pnpm 12 (pinned in `package.json`; `npm i -g pnpm@12` if your pnpm can't switch).

```bash
pnpm install     # also installs git hooks (format on commit, commit message check)
pnpm dev         # apps/legacy on http://localhost:3000 (PORT_BASE moves it)
pnpm check       # lint, types, tests, format — the same checks as CI
```

Demo login: any `+993` number, code **1234**. `+993 65 12 34 56` is the demo client with booking history.

## Layout

```
apps/legacy        the Next.js marketplace live on yeral.app (frozen; deleted at M4)
packages/config    shared tsconfig, ESLint, Prettier and Vitest presets
turbo/generators   `pnpm gen <generator>` templates
scripts/           version stamp and post-deploy smoke checks
docs/              memory bank, decisions, design export, API notes
.github/           CI and deploy workflows, Renovate, issue and PR templates
```

Planned: `apps/{landing,client,business,cms,api,storybook}`, `packages/{domain,contract,sdk,i18n,ui,lib}` — see
[systemPatterns](docs/memory-bank/systemPatterns.md).

## Shipping

Changes land through pull requests with green CI, squash-merged. There are no releases while the MVP is being built
(ADR 0009, amended 2026-10-21): no changesets, no version PR, no tags; Storybook deploys from `main`, the rest by hand.
Details: [operations](docs/memory-bank/operations.md).
