---
name: release
description: Ship Yeral changes — checks, changeset, commit/PR, staging and production deploys, verification, rollback. Use when finishing a piece of work, when the user says deploy / release / publish / ship, or when production needs rolling back.
---

# Release

References: `docs/memory-bank/operations.md`, ADR 0009, 0010.

## Today (before M0: Next app at the repo root, no CI, no staging)

1. `pnpm lint && pnpm typecheck` (and fix what fails).
2. Commit with a Conventional Commit message; `git push origin main`.
3. `pnpm run deploy`: OpenNext build + publish to the `yeral-web` Worker, **straight to production** (yeral.app). Tell the owner.
4. Verify: `curl -sI https://yeral.app/ https://yeral.app/search https://yeral.app/nozhnitsy` → 200; www → 308.
5. Rollback: `npx wrangler rollback` (choose the previous version) and say what happened.

## After M0

1. **Checks**: `pnpm lint && pnpm lint:fsd && pnpm typecheck && pnpm test` (turbo runs only what's affected).
2. **Changeset**: `pnpm changeset`: pick the apps/packages, patch / minor / major, one sentence a user would understand.
   Skip only for changes nobody can notice (refactors, docs, CI).
3. **Branch + PR**: `git switch -c feat/<topic>`, commit (`feat(client): …`), `git push -u origin HEAD`,
   `gh pr create --fill`. Squash-merge when CI is green.
4. **Staging**: merging to `main` deploys affected apps to `*-stage.yeral.app`. Check `/version.json` shows the merge commit,
   then run the relevant flows from skill `qa-flows`.
5. **Production**: merge the «Version packages» PR that Changesets keeps open. That tags `<app>@x.y.z`, creates GitHub
   Releases and deploys those apps. Verify `/version.json` and key pages on the production hosts.
6. **Rollback**: Cloudflare → `wrangler rollback` per Worker; Docker → redeploy the previous image tag
   (migrations are backward compatible, so the database stays). Record the incident in `activeContext.md`.

## Never

- Deploy to production from a branch, or skip CI on `main`.
- Put a secret in the repo, a workflow file or chat.
- Change repository settings, DNS or Cloudflare account resources without the owner's OK.
