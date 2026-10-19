# 0024. The own server runs every app: Docker + Caddy, Postgres beside the api, no Neon, no Workers

- Status: Accepted 2026-10-19 — supersedes [0007](0007-hosting-cloudflare-now-docker-later.md) for the api and the new
  apps; amends [0005](0005-typescript-backend-in-monorepo.md) (database), [0010](0010-ci-cd-github-actions.md) (deploy
  target) and [0020](0020-local-and-production-only.md) (rehearsing migrations)
- Decided by: owner (a netcup VPS 1000 for the first launch and other projects; "we don't need Neon, we can work on the
  VPS", 2026-10-19) + Claude (Caddy instead of nginx, what leaves the repo)

## Context

ADR 0007 put everything on Cloudflare now (Workers, Hyperdrive to Neon, R2, Cron Triggers) and an own server with
Docker + nginx later. The api was prepared for Workers but never deployed there. On 2026-10-19 the owner bought a
netcup VPS 1000 in the EU (4 vCPU, 8 GB, 128 GB) for Ýeral's first launch and their other projects; Claude set it up the
same day with a shared Caddy front door, Postgres 18 and the api in Docker (`infra/server`; ADR 0023, revised). That
left two production paths for one api, and Neon as a second Postgres nobody uses.

## Decision

- **The own server runs the api, its jobs and Postgres, and later the client, business and cms apps,** in Docker
  Compose behind one shared Caddy (`infra/server/edge`), which gets HTTPS certificates by itself. Cloudflare stays for
  DNS (not proxied), Storybook (a Worker at storybook.yeral.app), the legacy site until the new client site replaces it,
  and R2 for backups.
- **Caddy, not nginx,** on the server and in the local production-like stack (`infra/docker`), so both run the same
  front door: certificates without certbot, `X-Forwarded-For` written by Caddy and a client's own value dropped.
- **Removed:** the api's Worker entry and Wrangler config, Hyperdrive, the Workers deploy script, `neon.ts` and the
  `@neon/*` packages, nginx's config, and `/v1/places/ip` (it read Cloudflare's request data, so it always answered
  nothing on Node; first-launch visitors come through a VPN anyway, and the city choice starts at the market's main
  city, book chapter 10).
- **Jobs** run in the api process: a timer calls the jobs tick every minute; a Postgres advisory lock keeps runs from
  overlapping if a second process ever runs.
- **Photos** are stored on the server's disk behind a storage port (book chapter 10, P2 step 4), backed up with the
  database.
- **Kept portable** (ADR 0007's rules): web-standard code, no Cloudflare-only storage for product data, hosts from
  config. Hono still runs anywhere a `fetch` handler does.

## Consequences

- Easier: one production path; the database sits next to the api (no pooling proxy, no compute that sleeps); the same
  stack runs locally, in CI and on the server; the Turkmenistan deployment is the same Compose stack on another server
  (ADR 0023).
- Harder: we run the server: updates (automatic security updates are on), disk, backups (nightly to R2 with a restore
  drill, P2 step 7), alerts (P2 step 7). Rehearsing a risky migration means restoring a production dump into the
  local Postgres instead of a Neon branch.
- The owner may delete, when they choose: the Neon project and the unused Hyperdrive config `yeral-production`.
- Updated with this record: ADRs 0005, 0007, 0010, 0020; `operations.md`, `techContext.md`, `systemPatterns.md`,
  `progress.md`; product book chapters 6 and 10; `AGENTS.md`.

## Alternatives considered

- **Keep the Workers path as a second target**: two runtimes to test for an api that runs in one place.
- **Neon as the production database, the api on the server**: a database in another network on every query, a second
  account and bill, and data in two places to back up.
- **nginx on the server**: certbot and renewal hooks for what Caddy does by itself; the local stack would drift from the
  server's.
