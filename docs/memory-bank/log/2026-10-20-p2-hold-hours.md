# Holds count only while open (#42, feat/p2-3-hold-hours)

- Changed: P2 step 3, part 2 (book Q-120). `holdUntil(createdAt, booking, holdMinutes, businessHours)` in
  `@yeral/domain/lifecycle` uses up the hold only inside the business's open stretches and never runs past the visit
  start. One shared walk, `openStretches(business, from, to)` in `@yeral/domain/hours`, serves the hold and the open
  state (yesterday's day past midnight, breaks closed, overlapping special-day hours counted once). Booking creation
  passes the business's hours; the seed sets demo deadlines as "minutes still to go".
- Decided: breaks don't count, special days do; with no open time at all before the visit the hold counts plain time
  (book chapter 9: Claude (delegated), 20.10.2026).
- Follow-ups: the client is told the deadline as a clock time (Q-253), not `holdMinutes` (the booking screens and the
  catalog's pre-booking sentence); when the hours or special days change (step 4's settings endpoints), recompute the
  holds of waiting requests; check special-day hours like `weekHoursErrors`. activeContext: step 3 runs; past midnight
  and holds done; night reminders at 21:30 (Q-285) next.
