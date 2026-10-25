# Settings → Team: «Add a team member» (P4 slice 2, Team PR 2; feat/settings-team-add)

- Changed: the owner's «Add a team member» (with the user-plus icon) on Team (B-Team `inv`, design §8 «Topar», §28.4,
  book B-44; the administrator gets no button): a 560 modal in three steps. **Who**: the mobile number (PhoneInput),
  the name clients see (40), the specialization (optional, 60, sent in the app's language), the full name (optional,
  80, the team only: the book's step 1; the board doesn't draw it), the access level with what it means, a
  specialist's «Uses the app» with its caption (an administrator always uses the app). **Services**: the menu's
  groups, each with «All» (the native checkbox, mixed when some are picked) and «1 / 2», a row per service with its
  length and price, the count; a specialist needs one (an administrator none; with no services in the menu the step
  says so and goes on). **Review**: a row per answer that opens its step («Change»), the note on what happens next,
  then **Send invite** (`sdk.team.sendInvite`) or, for a specialist without the app, **Add to the team**
  (`sdk.team.addPhoneOnly`). Both take `serviceIds`, so no second call; the toast says «Invite sent to Gülşat · valid
  until 1 Nov» with «Copy invite link» (the link the send returns, in Team's link modal), or «… added to the team ·
  clients can book … now». Nothing closes the window while a send runs; closing gives the focus back to the button.
- Changed: `pages/settings-team/model/invite.ts` (tested): why a number can't be added, from the team as listed: a
  whole number that isn't a mobile one (a pasted «+993 65…» kept as 8 digits too), on the team (the owner too), an open
  invite, an earlier invite that ended, someone no longer on the team added back without the app (Reactivate brings
  their row back; the api would add a second one). With the app, someone no longer on the team is invited again on
  their old row, which brings back someone who left (§28.4). `inviteNow` reads an invite's state now (Team's rows too).
- Changed: the sdk refreshes the menu when someone joins or leaves with services (`staffChanged`: invite, phone-only,
  remove, reactivate) and on the `team.changed` event, as Team's counts and Services' «who does it» read it.
  `TEAM_NAME_MAX` moved to `@/shared/config`. The window reuses the wizard's team words (`setup.team`) where the board
  says the same.
- Decided (Claude, delegated): the book's chapter 9, 25.10.2026, B-44 (how). The step row is the board's `.stps`
  written in the page: the booking header's Stepper underlines the current step, which the modal doesn't.
- Follow-ups: the demo workspace's rules (only made-up 69… numbers, no invites; the api refuses the rest), with the
  demo frame; the staff drawer and remove / reactivate (Team PR 3).
