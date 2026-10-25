# Settings → Team: «Add a team member» (P4 slice 2, Team PR 2; feat/settings-team-add)

- Changed: the owner's «Add a team member» on Team (B-Team `inv`, design §8 «Topar», §28.4; the administrator gets no
  button): a 560 modal in three steps. **Who**: the mobile number (PhoneInput), the name clients see (40), the
  specialization (optional, 60, sent in the app's language), the access level with what it means, a specialist's
  «Uses the app» with its caption (an administrator always uses the app). **Services**: the menu's groups, each with
  «All» (a native checkbox, mixed when some are picked) and «2 / 3», a row per service with its length and price, the
  count; a specialist needs one (an administrator none; with no services in the menu the step says so and goes on).
  **Review**: a row per answer that opens its step («Change»), the note on what happens next, then **Send invite**
  (`sdk.team.sendInvite`) or, for a specialist without the app, **Add to the team** (`sdk.team.addPhoneOnly`). Both take
  `serviceIds`, so no second call; the toast says «Invite sent to Gülşat · valid until 1 Nov» with «Copy invite link»
  (the link the send returns, in Team's link modal), or «… added to the team · clients can book … now».
- Changed: `pages/settings-team/model/invite.ts` (tested): why a number can't be added, from the team as listed: not a
  mobile one (as the wizard's team step: everyone's, with the app or not), on the team (the owner too), an open invite,
  an earlier invite that ended, someone removed who had joined or works without the app; someone removed before they
  ever joined is invited again on their old row, as the api does.
- Changed: the sdk refreshes the menu with the team (`teamChanged`): an invite with services and a removal change who
  does each service, which Team's counts and Services read. `TEAM_NAME_MAX` moved to `@/shared/config` (the wizard's
  team step and this window).
- Decided (Claude, delegated): an earlier invite (expired, declined, cancelled) blocks a new one with «This number has
  an earlier invite. Resend it from its row in Team.»: the api keeps one row per number and answers `already_on_team`,
  and the row's Resend sends it again (the board, without that row, would replace it). The step row is the board's
  `.stps` written in the page (the booking header's Stepper underlines the current step, which the modal doesn't).
- Follow-ups: the staff drawer and remove / reactivate (Team PR 3); a race with another tab still ends in the api's
  `already_on_team` toast.
