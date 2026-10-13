---
name: release
description: Ship Yeral changes — checks, changeset, branch and PR, CI, the Changesets version PR, production deploy through GitHub Actions, verification, rollback. Use when finishing a piece of work, when the user says deploy / release / publish / ship, or when production needs rolling back.
---

# Release

References: `docs/memory-bank/operations.md`, ADR 0009, 0010. Workflows: `.github/workflows/{ci,release,deploy}.yml`.

## Ship a change

1. **Checks**: `pnpm check` (lint, FSD lint, types, tests, format). Fix what fails.
2. **Changeset**: `pnpm changeset` → pick the apps/packages, patch / minor / major, one sentence a user would understand.
   Skip only for changes nobody can notice (refactors, docs, CI).
3. **Branch + PR**: `git switch -c <type>/<topic>`, commit (`feat(client): …`), `git push -u origin HEAD`,
   `gh pr create --fill` (title = Conventional Commit; CI checks it). Wait for CI: `gh pr checks --watch`.
4. **Merge**: `gh pr merge --squash --delete-branch` once CI is green.
5. **Staging** (from the first new app on): merging deploys affected apps to `*-stage.yeral.app`. Check `/version.json`
   shows the merge commit, then run the relevant flows from skill `qa-flows`. `apps/legacy` has no staging.
6. **Production**: the release workflow keeps a «chore: version packages» PR open with the pending changesets. Merging it
   tags `@yeral/<app>@x.y.z`, creates GitHub Releases and runs `deploy.yml` for those apps; the smoke check verifies
   `/version.json` and key pages. Watch it: `gh run list --workflow=release.yml`, `gh run watch`.
   The version PR is created by GitHub Actions, so CI doesn't run on it (GitHub doesn't trigger workflows from its own
   token); it only changes versions and changelogs, so merge it as admin.
7. **Manual deploy** (fallback): `gh workflow run deploy.yml -f app=legacy -f environment=production`, or locally
   `pnpm --filter @yeral/legacy run deploy` (needs `wrangler login`).

## Rollback

Cloudflare: `cd apps/<app> && pnpm exec wrangler rollback` (pick the previous version), then fix forward with a PR.
Docker (own server, later): redeploy the previous image tag; migrations are backward compatible. Record the incident in
`activeContext.md`.

## Never

- Deploy to production from a branch, or merge to `main` with red CI.
- Put a secret in the repo, a workflow file or chat. Deploys use the `CLOUDFLARE_API_TOKEN` repository secret.
- Change repository settings, DNS or Cloudflare account resources without the owner's OK.
