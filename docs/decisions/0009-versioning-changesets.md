# 0009. Versioning with Changesets, trunk-based flow

- Status: Accepted 2026-10-13
- Decided by: Claude, on the owner's request for versioning

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
