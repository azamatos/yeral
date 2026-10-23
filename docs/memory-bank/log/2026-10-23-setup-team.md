# The setup wizard's team step (P4 slice 2, step 6; feat/setup-team)

- api: `PUT /v1/w/{slug}/setup/team` (`setupTeamSchema`, `sdk.setup.team`) saves the draft's team besides its owner
  in one transaction, replacing the step's last save (kept by phone, left out = deleted, `[]` = «I work alone»).
  Someone with the app (an administrator always, a mobile number) is `invited` with no invite yet; a specialist without
  the app is `active`. Specialists are bookable and do every service of the menu; administrators take no bookings.
  Issues: `not_mobile` (the app needs a mobile), `invalid` (an administrator without the app), `taken` (a number twice
  or the owner's own).
- `POST …/setup/finish` sends the invites to everyone `invited` with the app (each sees theirs at sign-in, 7 days).
- `GET /v1/w/{slug}/team` answers for a draft now (the owner is its only member who signs in): the wizard's team step
  reopens with it, and the rules step's "Who answers requests?" can show for a draft with a team (it hid on the 404).
  Inviting through the settings (`POST …/team/invites`) still answers 404 for a draft.
- Decided: chapter 9, 23.10.2026, B-04, B-06 (how).
- Follow-ups: the done step's «Send invites» isn't needed (the finish sends them); its note could say "N people will
  see their invite when they sign in".
