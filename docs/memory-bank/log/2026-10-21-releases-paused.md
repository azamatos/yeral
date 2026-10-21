# Releases paused until the MVP works (chore/remove-releases)

- Changed: ADR 0009 amended (releases paused), ADR 0010 and 0020 noted; `operations.md` (CI table, Versioning,
  "Deploys and labels" replaces "How the release flow behaves"), `techContext.md`, `systemPatterns.md`, AGENTS.md rule 11
  and the commands table, CLAUDE.md's skills table, README "Shipping"; book chapters 6 (F-206), 9 (Technology) and 10
  (P2 step 7).
- The owner, 2026-10-21: "Lets remove release logic for now. We are under development. There is no even working MVP
  version."
- Removed: `.github/workflows/release.yml`, `.changeset/` (config, README and the pending changesets),
  the root scripts `changeset`, `version-packages`, `tag-release`, the Changesets packages and their
  catalog entries, the changeset lines in the PR and issue templates and in the skills. The skill `release` is now
  `ship` (checks, PR, review, merge, a deploy by hand, rollback). Version PR #130 closed.
- Kept: Conventional Commits, squash merges on green CI, the versions and `CHANGELOG.md` files as they are, the tags,
  `deploy.yml` (Storybook from `ci.yml`, legacy by hand), the build stamp.
- For the lead to fold in: `activeContext.md` still says "PR #38 is the version PR: the owner decides when to release";
  `progress.md` mentions the release tags of M0–M2.
- Open PRs that add `.changeset/*.md` drop them when they rebase.
- Repository setting *Allow GitHub Actions to create and approve pull requests* is unused now; switching it off is the
  owner's call.
