# 0007. Hosting: Cloudflare now, own server with Docker + nginx later

- Status: Accepted 2026-10-13 (revised the same day after the owner's review)
- Decided by: owner (Cloudflare now, own server later, Docker + nginx, Cloudflare for the domain) + Claude (topology)

## Context

- Users will be in Turkmenistan, where Cloudflare and most foreign CDNs are reported filtered (Tor relays forum
  2026-01-12; turkmen.news; Cloudflare blog on 2024 unblocking). The owner's call: **don't optimise for that now**, make a
  working product first, and move to a server in Turkmenistan when it's bought.
- On that server everything will run from Docker containers behind nginx; Cloudflare stays only as the domain's DNS.
- The name or domain may change (`yeral.com`, or a new brand).

## Decision

**Now: everything on Cloudflare** (zone `yeral.app`, owner's account).

| Host | Worker | What runs |
|---|---|---|
| `yeral.app`, `www` | `yeral-landing` | static assets (prerendered) |
| `client.yeral.app` | `yeral-client` | TanStack Start SSR |
| `business.yeral.app` | `yeral-business` | static assets, SPA fallback |
| `cms.yeral.app` | `yeral-cms` | static assets, behind Cloudflare Access |
| `api.yeral.app` | `yeral-api` | Hono; Postgres (Neon) through Hyperdrive; R2 for photos; Cron Trigger for jobs |
| `storybook.yeral.app` | `yeral-storybook` | static Storybook |

Each Worker declares its host in its wrangler config (`custom_domain: true`), so a deploy creates the DNS record and
certificate by itself. Staging uses `<name>-stage` Workers on `*-stage.yeral.app` and a Neon `stage` branch.

**Later: one own server** (VPS, e.g. in Turkmenistan) with Docker Compose: nginx (TLS via Let's Encrypt, reverse proxy,
serves the static apps), `client` and `landing` Node servers, `api`, `jobs`, `postgres`, optional `minio` for photos.
Cloudflare becomes DNS only (grey cloud). Moving = DNS switch + `pg_dump`/restore + copy photos from R2.

**Ready from day one**, so the move is a deploy and not a project: every deployable has a Dockerfile, `infra/docker`
holds the Compose stack and `infra/nginx` the config; CI builds the images on every PR; `pnpm docker:up` runs the
production-like stack locally on `*.yeral.localhost`.

**Rules that keep the code portable**

- Code uses web standards and portable libraries only: Hono (`fetch` handler), postgres.js via Drizzle, S3 API for files.
  Cloudflare specifics live in `wrangler.jsonc` files and `entry/worker.ts`; Node specifics in `entry/node.ts` and Dockerfiles.
- No Cloudflare-only storage (D1, KV, Durable Objects) for product data.
- Domains, cookie domain and brand name come from config (env + i18n + logo assets), never hard-coded, so a rename
  is configuration.

## Consequences

- Cost now: Workers Free, then Workers Paid ($5/month) once SSR + API outgrow 10 ms CPU per request; Neon, R2, Sentry on free tiers. No VPS needed until the move.
- Two build targets for SSR apps and the api (Cloudflare, Node); CI builds both so neither rots.
- When the server is bought: test from Ashgabat that the IP works without a VPN *and* that Cloudflare's nameservers resolve there; if they don't, move DNS to a provider that does.

## Alternatives considered

- **Buy a VPS now**: rehearses the final setup, but adds ops work and cost before there's a product.
- **Cloudflare-native everything (D1, Durable Objects, KV, Queues)**: least code now, a rewrite when moving.
- **Self-host first in Turkmenistan**: blocked on buying the server; not the priority.
