# 0001. Monorepo with pnpm workspaces and Turborepo

- Status: Accepted 2026-10-13
- Decided by: owner + Claude

## Context

Yeral is four web apps (landing, client, business, cms) and an API that share most of their code: domain rules,
the API contract, the design system, translations, formatters. Separate repositories would mean publishing and
version-bumping internal packages for every change.

## Decision

One repository (`github.com/azamatos/yeral`) with `apps/*` and `packages/*`.

- **pnpm workspaces** link packages, keep `node_modules` strict (an undeclared import fails), and pin every dependency
  once through the `catalog:` in `pnpm-workspace.yaml`.
- **Turborepo** runs tasks over the dependency graph (`build` of a package before the apps that use it), caches
  results locally and in CI, and runs only what a change affects (`--affected`).
- Internal packages are consumed as TypeScript source: no build step, no publishing.

## Consequences

- A change to `@yeral/domain` is type-checked against every app in the same PR.
- One lockfile, one set of versions, one CI.
- CI must use `--affected` and the turbo cache to stay fast as apps grow.

## Alternatives considered

- **Nx**: more features (generators, module boundaries, distributed runs) but heavier config and plugins; we don't need it at this size. Turbo can be swapped later without moving code.
- **pnpm workspaces alone**: works, but no task graph or cache; scripts would be hand-ordered.
- **Separate repos**: version churn on every shared change.
