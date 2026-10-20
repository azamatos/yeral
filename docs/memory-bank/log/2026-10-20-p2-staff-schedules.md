# Staff schedules and removing someone (feat/p2-staff-schedules)

- Changed: P2 step 4, book B-47, B-50, F-112, F-114 (the owner only, administrators read: B-03, and the design
  session's note on 05-limits, #88).
- How (chapter 9, 20.10.2026, Claude (delegated)):
  - `GET`/`PUT /v1/w/{slug}/team/{staffId}/schedule` (`team/away.ts`): shift (null = the business hours), one break
    per weekday (5-minute steps), personal days off (always closed); `staffScheduleErrors`, `withinStaffDay`,
    `staffDayChangedOn` in `@yeral/domain/hours`.
  - Bookings ahead it leaves outside their day: 409 `bookings_affected`, then `move` (the first free colleague who
    does the services, else cancel with 3 offered times, `staff_away`; a waiting request declined, `no_staff`) or
    `keep`.
  - `POST …/remove` takes `{ affected, to, rows }`: 409 first (each booking with its `colleagues`), then `move` to `to`
    (a booking `to` can't take follows its row, else cancelled with offers), `keep`, `cancel`; 200 with
    `{ moved, kept, cancelled }`. Someone already gone (left by themself, B-15) is settled the same way.
  - `settleStaffBookings`: under the business row (`loadHours(…, { lock: 'no key update' })`, as an hours save), the
    business reloaded from the transaction; busy time over every affected date; each booking locked and read again;
    a move written in a savepoint (an overlap the database refuses falls back); the client told by the `moved` news
    (worded "now with …").
  - The race guard: every path that makes a booking take its time checks its specialists under the business row
    (`assertStaffFree`, through `assertOpenAt` with items): the client's booking, the team's, a request brought back;
    the team's move plans with the business read under the lock; a client's move confirmed onto a day off is
    `cannot_move` (`staff_off`). The jobs' cancel-with-times SMS accepts `staff_away`.
- Tests: `team/away.test.ts` (asked first, moved, a colleague busy, kept rows, cancel, the owner, the schedule read and
  saved, refused values, a day off with move and keep, nothing new on a kept day, the move confirmed onto a day off,
  the guard), domain unit tests; the team tests send the removal's choice.
- Follow-ups: the calendar shows a day off as the column shaded with its reason (F-121 with the calendar day view);
  the floor and room field the design session added to the address (#88) isn't in the contract yet.
