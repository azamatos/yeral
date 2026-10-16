# 0010. CI/CD on GitHub Actions

- Status: Accepted 2026-10-13; staging dropped by [0020](0020-local-and-production-only.md)
- Decided by: Claude

## Context

Today deploys are manual (`pnpm run deploy` from a laptop with `wrangler login`). The target moves from Cloudflare to
Docker on an own server later (ADR 0007), so CI/CD must produce both without being tied to one host.

## Decision

- **GitHub Actions**, three workflows:
  - `ci.yml` (PRs and `main`): install (pnpm cache) → `turbo run lint lint:fsd typecheck test build --affected` →
    Storybook/Vitest browser tests → API tests with a Postgres service → Playwright on affected apps → Docker image builds
    for affected deployables (build only, proves the Dockerfiles work).
  - `release.yml` (`main`): Changesets «Version packages» PR; when merged, tags `@yeral/<app>@x.y.z`, GitHub Releases, production deploy of those apps.
  - `deploy.yml` (reusable): environment + apps → build → run database migrations (api) → deploy → smoke check
    (`/version.json` shows the commit, key pages answer 200).
- **Staging** on every green push to `main` (including Storybook); **production** only from a release, behind the
  `production` GitHub Environment (optional manual approval).
- **Targets are steps** in `deploy.yml`: `wrangler deploy` now; later `docker build` → push to GHCR → SSH →
  `docker compose pull && up -d` on the server.
- Secrets in GitHub Environments: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `DATABASE_URL` per environment,
  later SSH deploy key. The owner creates tokens in the providers' dashboards and stores them with `gh secret set`.
- Renovate for dependencies, grouped, with automerge for dev-dependency patches.
- Branch protection on `main` (required CI, up to date before merge, linear history).

## Consequences

- Nobody deploys from a laptop once M0 lands (manual deploy stays as a fallback).
- Changing the host changes one workflow step, not the pipeline.
- Docker images are always buildable, so the move to the own server is a deploy.

## Alternatives considered

- **Cloudflare Workers Builds**: zero config, but Cloudflare-only and weaker for monorepo tests and gates.
- **Vercel / Netlify**: another host lock-in.
