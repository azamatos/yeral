# Ýeral

**Booking for any business that sells its time:** salons, dentists, restaurants, gyms, tutors, mechanics. Clients
find a business and book a time; the business answers in its calendar. The name comes from the Turkmen *ýer al*,
"take a place". The first market is Turkmenistan. The product is built in English, and each market adds its own
languages (Turkmen and Russian first).

> **Status: in active development, not launched yet.** The apps are built slice by slice, and three of the seven
> slices are done. The live sites are a demo with test data: any phone number signs in, the code shows on the screen
> (no SMS yet), and the example businesses are marked "Example".

| | |
|---|---|
| [yeral.app](https://yeral.app) | the client site: business pages, booking, My bookings |
| [business.yeral.app](https://business.yeral.app) | the business app: setup, settings, team, the calendar and requests |
| [storybook.yeral.app](https://storybook.yeral.app) | the design system: every component and its states |

## What works today

- **Business setup:** a guided setup (profile, services, hours, team, booking rules), Settings, inviting the team,
  choosing the page's address, and a QR code for the page.
- **The booking loop:** a client picks services, a specialist and a time, and signs in on the way. The business
  confirms or declines from its calendar and can offer other times. The client can cancel (with Undo), move the booking
  and leave a review. Both sides see changes within about a second.
- **Next:** the business's daily tools (calendar views, clients, walk-ins, complaints), discovery (home, search, the
  map, categories), the admin tool for the Ýeral team, and the launch mode.

## How it's built

- **Product first.** Every rule, role, limit and flow is written down in a product book ([docs/product](docs/product))
  before it's designed or built. Decisions are recorded as [architecture decision records](docs/decisions/README.md)
  (28 so far).
- **One monorepo.** pnpm and Turborepo hold the apps (api, client site, business app, Storybook) and shared packages:
  domain rules, the API contract, a typed SDK, the UI kit, i18n.
- **Contract first.** zod schemas in `packages/contract` define every endpoint. The Hono api implements them, an
  OpenAPI document is generated from them, and the apps reach the api only through the typed SDK.
- **Booking rules as plain code.** Availability (staff shifts, breaks, buffers, chains of services, "any specialist")
  and the booking lifecycle live in `packages/domain` as pure functions with unit tests.
- **Real-time updates.** A Postgres `LISTEN/NOTIFY` nudges a server-sent events stream, and the SDK refreshes what
  changed. Polling stays as a fallback ([ADR 0028](docs/decisions/0028-push-channel-sse-notify.md)).
- **No country written into the code.** Languages, currency, phone rules and the time zone come from one market
  definition, so another country is configuration rather than a rewrite.
- **A tested design system.** `@yeral/ui` gives every component stories for every variant, tested in Chromium with
  axe. A "Russian length" switch makes every text 30 % longer to catch overflow before translators do.
- **Architecture checked in CI.** The apps follow Feature-Sliced Design, enforced by Steiger, alongside ESLint,
  TypeScript, Vitest and the story tests on every pull request.
- **Own server.** The api, Postgres and both sites run in Docker on a VPS behind Caddy, with Cloudflare for DNS.

Ýeral is designed and directed by [Azamat Jorayev](https://azamatos.com). Much of the code is written by Claude Code
agents working in parallel from the rules in [AGENTS.md](AGENTS.md). Every change goes through a reviewed pull request
with green CI.

**In numbers (27.10.2026):** 244 pull requests merged in two weeks, about 62,000 lines of TypeScript, about 1,000 test
cases, 727 stories, 45 database migrations.

**Stack:** TypeScript · React · TanStack Router, Query and Start · Vite · Tailwind CSS · Radix UI · use-intl · Hono ·
PostgreSQL · Drizzle ORM · zod · Vitest · Storybook · Docker · Caddy · GitHub Actions

## For developers

| | |
|---|---|
| [AGENTS.md](AGENTS.md) | rules and commands for people and coding agents |
| [docs/memory-bank](docs/memory-bank/README.md) | project memory: brief, product rules, architecture, tech, operations, current focus |
| [docs/product](docs/product) | the product book: rules, roles, limits, flows, the build plan |
| [docs/decisions](docs/decisions/README.md) | why things are the way they are (ADRs) |
| [docs/design](docs/design) | the design export: design system, client site, business app |

### Run

Node 22.12+ (CI uses 24, see `.node-version`) and pnpm 12 (pinned in `package.json`; `npm i -g pnpm@12` if your pnpm can't switch).

```bash
pnpm install     # also installs git hooks (format on commit, commit message check)
pnpm db:up && pnpm db:setup   # Postgres in Docker, migrated and seeded
pnpm dev         # client :3001, business :3002, api :3004, Storybook :3005 (PORT_BASE moves them)
pnpm check       # lint, types, tests, format: the same checks as CI
```

Sign-in outside production: any mobile number, code **1234**.

### Layout

```
apps/              api, client site, business app, Storybook (the admin tool comes with slice 6)
packages/          domain rules, contract, sdk, ui, features, i18n, lib
packages/config    shared tsconfig, ESLint, Prettier and Vitest presets
turbo/generators   `pnpm gen <generator>` templates
scripts/           version stamp and post-deploy smoke checks
infra/             Docker images, the server's compose file, deploy script and Caddy sites
docs/              product book, memory bank, decisions, design export
.github/           CI and deploy workflows, Renovate, issue and PR templates
```

### Shipping

Changes land through pull requests with green CI, squash-merged. There are no releases while the MVP is being built
(ADR 0009, amended 2026-10-21): no changesets, no version PR, no tags. Storybook deploys from `main`; the server is
deployed by hand ([infra/server](infra/server/README.md)). Details: [operations](docs/memory-bank/operations.md).
