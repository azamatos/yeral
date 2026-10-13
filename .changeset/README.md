# Changesets

A PR that changes something users or API consumers can notice adds a changeset: `pnpm changeset`
(pick the apps/packages, patch/minor/major, one sentence in user terms). On `main`, the release
workflow collects them into the «chore: version packages» PR; merging it tags the versions and
deploys the changed apps to production. See docs/decisions/0009 and docs/memory-bank/operations.md.
