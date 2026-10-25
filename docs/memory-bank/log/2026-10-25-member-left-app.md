# Left or removed: the Team page (slice 2 follow-up; feat/member-left-app)

- Changed: Team's «No longer on the team» rows say how the person went (B-Team `.stt`), from the api's
  `TeamMember.ended` (#234):
  - «Left», when they left by themself or deleted their account, with «Invite again».
  - «Removed», when the owner removed them, with «Reactivate» and its caption as before. Someone removed before this
    was recorded reads «Removed» too.
  - Under each, the day it happened («today», «22 October»).
- «Invite again» (owner) opens «Add a team member» with their number, names and level filled in and the app on. The
  services are picked again, since the menu doesn't list someone off the team (`inviteAgainForm`). Sending reuses
  their old row, as the api does.
- «Someone left» (owner only, B-Team `.bnr`): a warning callout for each person who left with bookings or requests
  ahead that the owner hasn't chosen for. It reads «Bahar left: 2 bookings need a new specialist» with «Choose».
  Choose opens the remove window in its left mode (`RemoveMember mode="left"`):
  - «Who takes Bahar’s bookings?» and «Bahar left Glow Studio. They have 2 bookings.»
  - Their bookings are asked for as it opens. Then the same choices (move, keep, cancel and offer) and «Save».
  - The toast is «Bahar’s bookings are settled · 2 cancelled with 3 other times offered · the clients are notified».
    The banner goes, since the api counts nothing once the owner has chosen.
- Review round:
  - «Invite again» waits until the bookings they left are chosen for, so an invite can't hide them.
  - «needs» or «need» goes by the count.
  - Save asks again if the first ask failed.
  - The focus comes back to the row's «Invite again», or to «Add a team member» after a choice.
  - Both the banner and the window read `leftAhead`.
  - Opening Choose on someone with nothing ahead any more settles them at once, since there's nothing to choose.
  - «Invite again» carries the specialization as read, in the reader's language.
- Decided (Claude, delegated; chapter 9, 25.10.2026, B-15 (how)):
  - The left mode's lead says «They have», not the board's «She has»: the name is any team member's.
  - «Invite again» doesn't carry the services over.
