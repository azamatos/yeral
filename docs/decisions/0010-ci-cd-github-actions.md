# 0010. CI/CD on GitHub Actions

- Status: Accepted 2026-10-13
- Decided by: Claude

## Context

Today deploys are manual (`pnpm run deploy` from a laptop with `wrangler login`). The production target may change
from Cloudflare to Docker on a server (ADR 0007), so CI/CD must not be tied to one host.

## Decision

- **GitHub Actions** with three workflows: `ci.yml` (lint, FSD lint, typecheck, tests, build, e2e — only affected
  projects, turbo cache), `release.yml` (Changesets version PR and tags), `deploy.yml` (reusable: environment + apps →
  build → deploy → smoke check `/version.json` and key pages).
- Staging deploys on every green push to `main`; production only from a release, behind the `production` environment
  (optional manual approval).
- Deploy targets are steps inside `deploy.yml`: `wrangler deploy` today, Docker build + push to GHCR + SSH/Compose later.
- Secrets in GitHub Environments; Cloudflare via a scoped API token created by the owner.
- Renovate for dependencies, grouped, with automerge for dev-dependency patches.
- Branch protection on `main` (required CI, linear history), once the owner approves the repo setting.

## Consequences

- Nobody deploys from a laptop once M0 lands (manual deploy stays as a fallback).
- Changing the host changes one workflow step, not the pipeline.

## Alternatives considered

- **Cloudflare Workers Builds**: zero config, but Cloudflare-only and weaker for monorepo tests and gates.
- **Vercel / Netlify**: host lock-in, and the same reachability problem.
