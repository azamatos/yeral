# Architecture decision records

One file per decision that changes architecture, a core library or a process. Numbered, never renumbered.
A decision that's replaced stays here with status `Superseded by NNNN`.

| # | Decision | Status |
|---|---|---|
| [0001](0001-monorepo-pnpm-turborepo.md) | Monorepo with pnpm workspaces and Turborepo | Accepted 2026-10-13 |
| [0002](0002-vite-tanstack-instead-of-nextjs.md) | Vite + TanStack instead of Next.js | Accepted 2026-10-13 |
| [0003](0003-four-sites-on-subdomains.md) | Four sites on subdomains, short links on the apex | Accepted 2026-10-13 |
| [0004](0004-feature-sliced-design.md) | Feature-Sliced Design inside apps | Accepted 2026-10-13 |
| [0005](0005-typescript-backend-in-monorepo.md) | TypeScript backend in the monorepo (Hono, Postgres, Drizzle) | Accepted 2026-10-13 |
| [0006](0006-contract-and-sdk.md) | zod contract, Hono RPC client, generated OpenAPI | Accepted 2026-10-13 |
| [0007](0007-portable-hosting.md) | Portable hosting, no third-party hosts at runtime | Accepted 2026-10-13 |
| [0008](0008-i18n-use-intl.md) | i18n with use-intl | Accepted 2026-10-13 |
| [0009](0009-versioning-changesets.md) | Versioning with Changesets, trunk-based flow | Accepted 2026-10-13 |
| [0010](0010-ci-cd-github-actions.md) | CI/CD on GitHub Actions | Accepted 2026-10-13 |

New record: copy [`_template.md`](_template.md), take the next number, add a row here, update the affected
memory-bank file in the same commit.
