# What `bookings_affected` lists, for the AffectedBookingsList (P4 slice 2; feat/affected-details)

- The 409 `bookings_affected` (an hours or special-day save, a specialist's schedule, removing someone; book B-39, B-40,
  B-47, B-50, Q-211) now carries what the AffectedBookingsList draws (B-Settings, B-Team; COMPONENTS.md
  HoursAffectedBookings, ShiftAffectedBookings, RemoveStaffModal): `requests`, how many of `count` are waiting requests
  ("5 bookings and 1 request fall outside the new hours", the label "5 bookings · 1 request"); and on each booking its
  `status` (`pending` | `confirmed`), a request's `holdUntil` (its timer, "45 min"; null for a booking) and `services`,
  the booked services' names in the reader's language ("client · service · specialist").
- Additive: every field the details had stays as it was. `affectedDetails` (`modules/bookings/engine.ts`) takes the
  reader's language; `updateHours`, `updateSchedule` and `removeMember` pass the signed-in person's.
- Tests: the hours save lists confirmed bookings with their service and a waiting request with its answer time
  (`settings/hours.test.ts`); removing someone lists each booking's service (`team/away.test.ts`).
- Next: the AffectedBookingsList in `entities/booking/ui/affected-bookings-list` and the hours one in
  `features/edit-hours/ui/affected-bookings` (COMPONENTS.md), with Settings → Hours.
