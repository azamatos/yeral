---
name: ship
description: Finish and ship Yeral changes — checks, branch and PR, CI, review, merge, a production deploy by hand, verification, rollback. Use when finishing a piece of work, when the user says deploy / ship / merge, or when production needs rolling back.
---

# Ship

References: `docs/memory-bank/operations.md`, ADR 0009 (amended 2026-10-21: releases paused), 0010, 0020. Workflows:
`.github/workflows/{ci,deploy}.yml`.

There are **no releases while the MVP is being built**: no changesets, no version PR, no tags. Versions stay where
they are until releases come back before the first launch (book chapter 10, P2 step 7).

## Ship a change

1. **Checks**: `pnpm check` (lint, FSD lint, types, tests, format). Fix what fails.
2. **Branch + PR**: `git switch -c <type>/<topic>`, commit (`feat(client): …`), `git push -u origin HEAD`,
   `gh pr create --fill` (title = Conventional Commit; CI checks it). Wait for CI: `gh pr checks --watch`.
3. **Review, then merge**: run skill `code-review` on the PR (`high` for code, `medium` for docs), fix what it finds,
   then `gh pr merge --squash --delete-branch` once CI is green.
4. **No staging** (ADR 0020): prove the change locally before merging — `pnpm check`, the Docker stack
   (`pnpm docker:up`) for api or infra changes, the flows from skill `qa-flows` against local dev servers.
5. **Storybook** deploys itself from `main` after the checks (`ci.yml` → `deploy-storybook`).
6. **Production by hand** (only when the owner asks), after the flows are click-tested (skill `qa-flows`): legacy and
   Storybook with
   `gh workflow run deploy.yml -f app=legacy -f environment=production` (the smoke check verifies `/version.json` and
   key pages), or locally `pnpm --filter @yeral/legacy run deploy` (needs `wrangler login`); the api on the own server
   with `infra/server/README.md` → "Deploying Ýeral by hand".

## Rollback

Cloudflare: `cd apps/<app> && pnpm exec wrangler rollback` (pick the previous version), then fix forward with a PR.
Own server: deploy the previous commit the same way (`infra/server/README.md`); migrations are backward compatible back to
the newest contract migration (one that drops a column, as 0041 does), so never roll back to an image older than it
without restoring the backup taken before the deploy (operations.md, "Rollback"). Record the
incident in a `docs/memory-bank/log/` note.

## Never

- Deploy to production from a branch, or merge to `main` with red CI.
- Put a secret in the repo, a workflow file or chat. Deploys use the `CLOUDFLARE_API_TOKEN` repository secret.
- Change repository settings, DNS or Cloudflare account resources without the owner's OK.
