# 2026-10-21 · The business logo (P2 step 4 leftover)

- `PUT`/`DELETE /v1/w/{slug}/settings/logo` (owner, administrators): a photo form, kept like every photo (bytes
  checked, metadata stripped, `media/up/b/<business>/…`); the old one goes from the store; `business.updated` refreshes
  the team's screens. Migration 0039 adds `businesses.logo`.
- `logo` on the profile (`businessProfile`), the workspaces (`workspace`, beside the cover `photo`) and the invite card;
  a deleted draft's logo goes with the account. sdk: `settings.setLogo(slug)`, `settings.removeLogo(slug)`.
- The business app's switcher, opening card, invite card and My profile's workspaces show the logo (else the letter
  tile) instead of the cover photo.
- Not done: the public page and the cards don't show a logo (the client boards don't draw one).
