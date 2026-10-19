# Past midnight (#41, feat/p2-3-past-midnight)

- Changed: P2 step 3, part 1 (book Q-105). A business day keeps everything after its midnight, up to 48:00
  (`@yeral/domain/hours`: `DAY_MINUTES`, `MAX_DAY_END`, `weekHoursErrors()`; the open state after midnight reads
  yesterday's hours, a break past midnight included). Free times count the day before's late bookings and the day
  after's early ones (`busyOn()`); the api loads busy time one day either side; yesterday's business day stays
  bookable while it runs (`inBookingWindow`, `nextFreeSlot`); the completion job finishes a past-midnight visit only
  after its end. The contract's minutes reach 2880. Migration 0007 puts `span` in absolute minutes: the database
  refuses overlaps across midnight and allows minutes to 2880.
- Decided: the business-day model (book chapter 4, chapter 9: Claude (delegated), 20.10.2026).
- Follow-ups: the settings endpoints (step 4) call `weekHoursErrors()` and check special days the same way; the
  screens for days past midnight are undrawn (design round 3). activeContext: step 3 runs, past midnight done, holds
  in opening hours (Q-120) next.
