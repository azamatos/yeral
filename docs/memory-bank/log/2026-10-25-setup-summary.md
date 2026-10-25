# The setup step list's summaries (slice 2 follow-up; feat/setup-summary-api, then the app)

- Changed (api, additive): `GET /v1/me/setup`'s `setup` now carries what the wizard's step list summarises (B-Onboarding
  `sums`). The step list no longer has to read the whole menu or team.
  - `services`: the services on the menu, archived ones left out («3 services»).
  - `team`: the people besides the owner, invited ones counted and removed ones not (0 «I work alone», else «3 people»).
  - `rules`: the booking rules' `{ confirmMode, holdMinutes }`, never null («I confirm · 30 min» or «Instant
    confirmation»).
- API tests (CI), `setup.test.ts`:
  - A new draft reads 0, 0 and the defaults.
  - The services step reads 3.
  - The team step reads 3.
- Review round:
  - The counts are `min(0)`, and the services count reuses the menu's `onMenu`.
  - The sdk's `setup.services` and `setup.team` refresh the setup, so the step list's counts show at once.
  - Settings changes still leave the draft to their event, as before.
  - Tests: an admin-added draft is checked whole, and dropping a service brings the count to 2.
