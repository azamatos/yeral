# Left or removed: the api (slice 2 follow-up; feat/member-left-api)

- Changed: migration 0044 gives `staff` `ended_at` and `ended_by` (`self` | `owner`, checked). They record when a
  membership ended and who ended it:
  - Leaving (B-15) records `self`, and so does deleting the account, for each team still active.
  - The owner's removal (B-50) records `owner`. The owner settling the bookings of someone who left keeps `self`.
  - Coming back (an invite again on the old row, «Reactivate») clears both.
  - Rows removed before 0044 have neither, and show as removed.
- Contract (additive): `TeamMember.ended`, either `{ at, by, bookings, requests }` or null. For someone who left
  (`self`), the team list counts the bookings and requests still ahead with them, the same `leaveCounts` their leave
  confirm showed. That count feeds the owner's «Aýna left: 4 bookings and 1 request need a new specialist · Choose».
- API test (CI): `team.test.ts`.
  - Removed reads `by: owner`, and Reactivate clears it.
  - Leaving reads `by: self` with the counts from the leave confirm, and the owner's settling keeps `self`.
  - Deleting the account records `self`.
- Next (app PR): the Team list's «Left» with «Invite again» vs «Removed» with «Reactivate», and the owner-only banner
  that opens the remove window's AffectedBookingsList for that person.
