# Architecture decision records

One file per decision that changes architecture, a core library or a process. Numbered, never renumbered.
A decision that's replaced stays here with status `Superseded by NNNN`. Records written and revised on the same day
before any code used them were edited in place (marked "revised").

| # | Decision | Status |
|---|---|---|
| [0001](0001-monorepo-pnpm-turborepo.md) | Monorepo with pnpm workspaces and Turborepo | Accepted 2026-10-13 |
| [0002](0002-vite-tanstack-instead-of-nextjs.md) | Vite + TanStack instead of Next.js | Accepted 2026-10-13 |
| [0003](0003-four-sites-on-subdomains.md) | Four sites on subdomains, short links on the apex | Superseded by 0015 |
| [0004](0004-feature-sliced-design.md) | Feature-Sliced Design inside apps | Accepted 2026-10-13 |
| [0005](0005-typescript-backend-in-monorepo.md) | TypeScript backend in the monorepo, on Postgres from the start | Accepted 2026-10-13 (revised); auth revised by 0019 |
| [0006](0006-contract-and-sdk.md) | zod contract, Hono RPC client, generated OpenAPI | Accepted 2026-10-13 |
| [0007](0007-hosting-cloudflare-now-docker-later.md) | Hosting: Cloudflare now, own server with Docker + nginx later | Accepted 2026-10-13 (revised) |
| [0008](0008-i18n-use-intl.md) | i18n with use-intl | Accepted 2026-10-13, amended by 0016 |
| [0009](0009-versioning-changesets.md) | Versioning with Changesets, trunk-based flow | Accepted 2026-10-13 |
| [0010](0010-ci-cd-github-actions.md) | CI/CD on GitHub Actions | Accepted 2026-10-13 (revised) |
| [0011](0011-state-management.md) | State management: each kind of state has one owner | Accepted 2026-10-13 |
| [0012](0012-design-system-and-storybook.md) | Design system in `@yeral/ui`, documented and tested in Storybook | Accepted 2026-10-13 (revised 2026-10-14) |
| [0013](0013-testing-strategy.md) | Testing strategy | Accepted 2026-10-13 |
| [0014](0014-parallel-agents.md) | Working with several agents in parallel | Accepted 2026-10-13 |
| [0015](0015-marketplace-on-the-apex.md) | The marketplace lives on yeral.app; no separate landing | Accepted 2026-10-14 |
| [0016](0016-languages-tk-ru-en.md) | Turkmen first, then Russian and English; every client URL carries its language | Accepted 2026-10-14 |
| [0017](0017-booking-model.md) | One booking engine for any business that sells time | Accepted 2026-10-14 (revised) |
| [0018](0018-business-workspace-model.md) | Business workspace model: own teams, roles and client records; Better Auth for identity only | Accepted 2026-10-14 (identity revised by 0019) |
| [0019](0019-own-phone-login-and-sessions.md) | Our own phone-code login and database sessions instead of Better Auth | Accepted 2026-10-14 |
| [0020](0020-local-and-production-only.md) | Local and production only: no staging | Accepted 2026-10-16 |

New record: copy [`_template.md`](_template.md), take the next number, add a row here, update the affected
memory-bank file in the same commit.
