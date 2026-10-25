# Settings → Team: remove someone from the drawer (P4 slice 2, Team PR 3b-1; feat/settings-team-hours)

- Changed: `AffectedBookingsList`, `useAffectedCount` and `useJoin` moved to `entities/booking` (COMPONENTS.md), now
  that Team lists bookings too; the list takes an `outcome` line under a row. `features/edit-hours` keeps the hours'
  modal (`HoursAffectedBookings`), and the Hours page and special days read the list from the entity.
- Changed: «Remove from the team» in the staff drawer's footer (owner, not the owner's row) opens «Remove … from the
  team?» (B-Team `rm`, §28.4, book B-50; `pages/settings-team/ui/remove-member.tsx`): «… loses access to Glow Studio,
  and clients can't book … any more. Past bookings and reviews stay.» The first «Remove …» asks the api, which removes
  someone with nothing ahead at once; with bookings ahead it answers 409 and the window shows them with Move to
  another specialist (picked when someone else does the services; «To» lists the colleagues who do any of them, under
  the cards), Keep them, Cancel and offer 3 other times. With Move, each row says who takes it, or «Nobody else does
  Gel polish» / «Leýli doesn't do …» with its own Keep it or Cancel and offer 3 other times (Keep it first). The toast
  sums it up as the board does («Maral removed from the team · 1 moved to Leýli, 1 cancelled with 3 other times offered
  · the clients are notified»). Reactivate stays on the row (#188).
- Decided (Claude, delegated; chapter 9, 25.10.2026, B-50 (how)): the window asks first and lists the bookings after
  the first Remove (the api's 409 is the only list of what's ahead; the board shows it at once and says «has no
  upcoming bookings» when there are none); «To» sits under the cards, as a card is a radio button.
- Review (one round, 12 findings): with Move every listed booking goes with its own fallback (Keep it unless
  changed), so one the colleague can't take then (busy, away) isn't cancelled unasked; Move is offered only when all
  bookings ahead are listed (the api lists 50); «Nobody else does …» names only this person's part of a shared
  booking; «Moves to Leýli» is said, not only drawn; each row's choice names the client and the time; the focus goes to
  «Add a team member» after a removal; the footer keeps its full-width buttons where there's no Remove; the
  window's words come from `affected` where they're the same; the mutation lives in one place.
- Follow-ups: Team PR 3b-2 (Hours with time off in the drawer); settling the bookings of someone who left (B-15,
  the board's «Someone left» banner and toast) with this window, which then moves to `features/remove-staff`
  (COMPONENTS.md); `useJoin` is a general joiner and could live in `@/shared/i18n`; the hours' modal and this one could
  share their body in `entities/booking`.
