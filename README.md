# Yeral

Booking for any business that sells its time, launching in Turkmenistan: a client marketplace, a business workspace,
an internal CMS and the API behind them, in one monorepo.

**Status:** the apps are being built slice by slice ([roadmap](docs/memory-bank/progress.md)); https://yeral.app shows a
coming-soon page from the own server until the client site takes it over.

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
pnpm db:up && pnpm db:setup   # Postgres in Docker, migrated and seeded
pnpm dev         # client :3001, business :3002, api :3004, Storybook :3005 (PORT_BASE moves them)
pnpm check       # lint, types, tests, format — the same checks as CI
```

Sign-in outside production: any mobile number, code **1234**.

## Layout

```
apps/              client site, business app, api, Storybook
packages/          domain rules, contract, sdk, ui, features, i18n, lib
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
