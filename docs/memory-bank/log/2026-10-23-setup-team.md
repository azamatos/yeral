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
- The business app: `useTeamStep` (`pages/setup/ui/team-step.tsx`, `model/team.ts` with its unit test) on the frame's
  pattern: «I work alone» / «I have a team» (OptionCard L), the owner's row, a row per person (name, PhoneInput 44,
  Specialist / Admin, remove; «Uses the app» for a specialist) with its caption (where the invite shows, mobile only,
  taken, phone needed), «Add a team member», the access levels explained. Continue saves the team in one go
  (`sdk.setup.team`) when it changed and moves the draft to rules. Stories `Team`, `TeamProblems`; the fake api shows
  the draft's team and takes `PUT …/setup/team`. Every step of the wizard is built now: `LaterStep` is gone.
- `hasTeam` (rules step) counts a draft's person the finish will invite (`invited`, no invite yet): «Who answers
  requests?» shows after the team step.
- Leaving the step (Back, the list, «Continue later») with a row half filled stays and says what to fix, so no edit
  is dropped; «Add a team member» stops at 30 (`SETUP_TEAM_MAX`; a bigger team in Settings → Team).
- Follow-ups (review, not done): the team step's summary in the step list («I work alone» / «N people»); a number in
  the unused range says "starting with 6 or 7" though it does; the footer hint for a number twice; focus after adding
  or removing a row; `hasTeam` reading "invited, no invite" as "the finish will invite" (an api fact would be cleaner);
  the done step's «Send invites» and its note (the finish sends them now).
