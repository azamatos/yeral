# 0020. Local and production only: no staging

- Status: Accepted 2026-10-16 — replaces the staging parts of [0007](0007-hosting-cloudflare-now-docker-later.md) and
  [0010](0010-ci-cd-github-actions.md); production is the own server since [0024](0024-own-server-docker-caddy.md), so a
  risky migration is rehearsed on a production dump restored into the local Postgres, not on a Neon branch
- Decided by: owner ("we can not afford staging, let's fully work with prod and local") + Claude (how)

## Context

ADR 0007 and 0010 planned a staging environment (`*-stage.yeral.app`, a Neon `stage` branch, a deploy on every green push
to `main`). It was prepared in M2g but never created. Ýeral is free for now and has no budget for a second set of
hosted resources, and the session cookies of a staging site on the production domain raised a security question of their
own (staging and production sharing `Domain=yeral.app`).

## Decision

- Two kinds of environment: **local** (`pnpm dev` with the local Postgres, and `pnpm docker:up`, the production-like
  stack on `*.yeral.localhost`) and **production** (Cloudflare Workers + Neon). No staging, no PR preview databases.
- A change is proven locally before it merges: tests (unit, story, API on Postgres), the Docker stack, a code review, and
  green CI on the PR. Merging to `main` deploys only Storybook.
- Production changes only from a release (the Changesets version PR), and the owner decides when a release ships.
  (Amended 2026-10-21: releases are paused until the MVP works, ADR 0009; production is deployed by hand when the owner
  asks.)
- A risky migration can be rehearsed on a throwaway Neon branch of production (branches are free; delete it afterwards).
- The api's Worker has one environment, `production` (`yeral-api` on `api.yeral.app`); it's created when the new client
  site (M3) ships, with the owner's go-ahead for the Hyperdrive config and the DNS record.
- `@yeral/lib/site` knows `local`, `docker` and `production` only; the demo seed runs only on local and docker
  databases; production gets the category catalogue.

## Consequences

- Nothing to pay for or keep alive between laptop and production; one cookie domain, no cross-environment session risk.
- Production is the first shared place a change runs, so releases need care: smoke checks after every deploy
  (`scripts/smoke.sh`) and a rollback path (redeploy the previous tag) stay mandatory.
- Demo data can't be shown online on a separate site; whether production shows the design's demo businesses before real
  ones join is an open product question.

## Alternatives considered

- **Staging on Cloudflare + a Neon branch** (ADR 0007/0010): the plan until now; dropped for cost and the cookie overlap.
- **PR previews with a Neon branch each**: cheap per PR but still a hosted environment to secure; not needed while one
  person reviews every change locally.
