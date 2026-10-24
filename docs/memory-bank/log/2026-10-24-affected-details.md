# What `bookings_affected` lists, for the AffectedBookingsList (P4 slice 2; feat/affected-details, #175)

- The 409 `bookings_affected` (an hours or special-day save, a specialist's schedule, removing someone; book B-39, B-40,
  B-47, B-50, Q-211) now carries what the AffectedBookingsList draws (B-Settings, B-Team; COMPONENTS.md
  HoursAffectedBookings, ShiftAffectedBookings, RemoveStaffModal):
  - `counts`: `count` split into confirmed bookings and waiting requests, the shape a leave confirm already gets
    (`countAhead`, `leaveCounts`): "5 bookings and 1 request fall outside the new hours", the label "5 bookings · 1 request".
  - on each booking: `status` (`pending` | `confirmed`, as it stands now: `aheadAs`), a request's `holdUntil` (its timer,
    "45 min"; its start when it has no hold time, as `effectiveStatus` expires it; null for a booking), and `items`, each
    service with who does it in the reader's language (`teamItemSchema`, as the requests list and the calendar send
    them): "client · service · specialist", and the remove modal's "Nobody else does Hair colouring".
- Additive: every field the details had stays as it was. `affectedDetails` (`modules/bookings/engine.ts`) takes the
  reader's language and `now`; `updateHours`, `updateSchedule` and `removeMember` pass the signed-in person's language.
  The contract's `pending | confirmed` for a booking ahead is one schema in `errors.ts` (with `client_has_bookings`).
- Tests: `affectedDetails` in Russian with a two-specialist booking and a request without a hold time
  (`bookings/engine.test.ts`); the hours save lists confirmed bookings with their item and a waiting request with its
  answer time (`settings/hours.test.ts`); removing someone lists each booking's item (`team/away.test.ts`). The market
  has one language, so the api tests can't show a reader in another one; the unit test does.
- Next: the AffectedBookingsList in `entities/booking/ui/affected-bookings-list` and the hours one in
  `features/edit-hours/ui/affected-bookings` (COMPONENTS.md), with Settings → Hours.
