# 0009. Versioning with Changesets, trunk-based flow

- Status: Accepted 2026-10-13 · amended 2026-10-21 (releases paused until the MVP works)
- Decided by: Claude, on the owner's request for versioning

## Amendment 2026-10-21: releases paused

The owner: "Lets remove release logic for now. We are under development. There is no even working MVP version." The
version PR had become a chore nobody used: it collected changesets for apps that don't run yet, and once the repository
was public its CI waited for approval. Removed: `release.yml`, `.changeset/` with its config, the `changeset` /
`version-packages` / `tag-release` scripts and the Changesets packages, the changeset step in AGENTS.md, the skills and
the templates. Kept: trunk-based work, Conventional Commits, squash merges on green CI, the `/v1` API rules, forward-only
migrations, the build stamp, the versions and `CHANGELOG.md` files as they are, and the existing tags. Storybook still
deploys from `main`; legacy and the api deploy by hand when the owner asks (`deploy.yml`, `infra/server/README.md`).
Releases come back before the first launch (book chapter 10, P5): Changesets again or another tool, decided then.

## Context

Five deployables (four apps + api) and several internal packages change at different speeds. We need to know what's
in production, have readable changelogs, and keep a stable API for clients that can't update instantly.

## Decision

- **Trunk-based**: `main` always deployable; short branches → PR → squash merge.
- **Conventional Commits** for PR titles and commits (`feat(client): …`), checked by commitlint in a git hook and CI.
- **Changesets**: user-visible changes add a changeset; the «Version packages» PR bumps versions and writes a
  `CHANGELOG.md` per app and package; merging it tags `@yeral/<app>@x.y.z` and releases those apps to production.
- **SemVer**: apps on `0.x` until the public launch (`1.0.0`); packages private, `workspace:*`.
- **API**: `/v1` path; additive changes only; breaking changes go to `/v2` side by side; OpenAPI diff in CI.
- **Database**: forward-only SQL migrations, expand → migrate → contract.
- **Build stamp**: `/version.json` in every app, `X-Yeral-Version` from the api.

## Consequences

- One small extra step per PR (`pnpm changeset`), done by whoever opens the PR (including the agent).
- Production releases are deliberate and batched; staging gets every merge.

## Alternatives considered

- **release-please**: versions from commit messages alone; less control over wording and grouping in a monorepo of apps.
- **No versions, deploy every merge to production**: simplest, but no record of what users have and no gate before production.
