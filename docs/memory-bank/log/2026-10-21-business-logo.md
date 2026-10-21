# 2026-10-21 · The business logo (P2 step 4 leftover)

- `PUT`/`DELETE /v1/w/{slug}/settings/logo` (owner, administrators): a photo form, kept like every photo (bytes
  checked, metadata stripped, `media/up/b/<business>/…`); the old one goes from the store; `business.updated` refreshes
  the team's screens. Migration 0039 adds `businesses.logo`.
- `logo` on the profile (`businessProfile`), the workspaces (`workspace`) and the invite card, which lose the unused cover
  `photo`, and on the admin tool's check (`adminBusiness`); `logoOf()` and `coverOf()` in `catalog/map.ts`; a deleted
  draft's logo goes with the account. sdk: `settings.setLogo(slug)`, `settings.removeLogo(slug)`.
- The business app's switcher, opening card, invite card and My profile's workspaces show the logo (else the letter
  tile) instead of the cover photo.
- Not done: the public page and the cards don't show a logo (the client boards don't draw one).
- Review (one round) left as they are: one helper for the three set-or-remove-one-photo pairs (the person's, a team
  member's, the logo: each has its own side effects); a narrower event than `business.updated` (a logo changes rarely);
  checking the settings permission before an upload's body is read (the gallery and the person's photo work the same
  way; the upload limits cap it) — a follow-up for every upload.
