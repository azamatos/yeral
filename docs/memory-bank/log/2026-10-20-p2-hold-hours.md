# Holds count only while open (feat/p2-3-hold-hours)

- Changed: P2 step 3, part 2 (book Q-120). `holdUntil(createdAt, booking, holdMinutes, businessHours)` in
  `@yeral/domain/lifecycle` uses up the hold only inside the business's open stretches, from yesterday's business day
  (it may run past midnight) to the visit's day, and never past the visit start. Booking creation and the seed pass the
  business's hours.
- Decided: breaks don't count (as in the open state); special days do (book chapter 9: Claude (delegated),
  20.10.2026).
- Follow-ups: activeContext: step 3 runs; past midnight and holds done; night reminders at 21:30 (Q-285) next.
