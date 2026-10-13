# Active context

_Last updated: 2026-10-13_

## Current focus

Architecture agreed and written down (this memory bank, ADRs 0001–0010, project skills). **Next: M0, the monorepo
skeleton**, once the owner gives the go. The live site is still the Next.js marketplace at https://yeral.app.

## Recent decisions (2026-10-13)

- Monorepo: pnpm workspaces + Turborepo ([0001](../decisions/0001-monorepo-pnpm-turborepo.md)).
- Next.js replaced by Vite + TanStack: Start for landing and client, Router SPA for business and cms ([0002](../decisions/0002-vite-tanstack-instead-of-nextjs.md)).
- Four sites: `yeral.app` landing, `client.`, `business.`, `cms.` + `api.`; short salon links stay on the apex ([0003](../decisions/0003-four-sites-on-subdomains.md)).
- Feature-Sliced Design inside apps; packages are the cross-app lower layers ([0004](../decisions/0004-feature-sliced-design.md)).
- Backend in TypeScript in this monorepo: Hono + Postgres + Drizzle; the demo server is its first version ([0005](../decisions/0005-typescript-backend-in-monorepo.md)).
- Contract: zod in `@yeral/contract`, Hono RPC client, generated OpenAPI ([0006](../decisions/0006-contract-and-sdk.md)).
- Portable hosting, no third-party hosts at runtime, because of filtering in Turkmenistan ([0007](../decisions/0007-portable-hosting.md)).
- i18n with use-intl; ru now, tk next ([0008](../decisions/0008-i18n-use-intl.md)).
- Versioning with Changesets and Conventional Commits, trunk-based ([0009](../decisions/0009-versioning-changesets.md)).
- CI/CD on GitHub Actions: staging on every green `main`, production on release ([0010](../decisions/0010-ci-cd-github-actions.md)).
- CMS = admin + content (owner's answer).

## Open questions

| # | Question | Who | Blocks |
|---|---|---|---|
| 1 | Is `yeral.app` (Cloudflare) reachable in Ashgabat without a VPN, and which production host is? | owner: test from Turkmenistan | M8 |
| 2 | Make the GitHub repo private? (public today) | owner | — (recommended before M2) |
| 3 | Which locale owns URLs without a prefix: `ru` or `tk`? | owner | M7 |
| 4 | `yeral.app` or `yeral.tm` long term? (the decks use `.tm`) | owner | M8 |
| 5 | Demo worlds: one per visitor (planned) or also a shared world for live demos? | decide in M2 | M2 |
| 6 | Rename the Cloudflare workers.dev subdomain so PR preview URLs can be turned on | owner, dashboard | previews |
| 7 | Cloudflare API token for CI, stored as a GitHub secret | owner | M0 deploy step |
| 8 | SMS gateway and push provider for production | owner + research | M9 |
| 9 | Subscription and commission prices in manats; when online payment becomes possible | owner | M4 pricing copy |
| 10 | Real salon photos and texts to replace the stock seed | owner | public launch |

## Next steps

1. M0: move the Next app to `apps/legacy`, create the workspace, `@yeral/config`, turbo, lint/format/hooks, Changesets, CI.
2. M1: extract `domain`, `contract`, `i18n`, `ui`, `lib` from the legacy app.
3. M2: `apps/api` demo server + `@yeral/sdk`.
