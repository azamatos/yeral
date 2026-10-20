# Blocked time (feat/p2-blocked-time)

- Changed: P2 step 4, book B-18, F-121, Q-204 ("Wagty ýap": person, from–to, reason, optional repeat; the rights of
  adding bookings; never over a booking).
- How (chapter 9, 20.10.2026, Claude (delegated)):
  - `staff_blocks` (migration 0027): one row per date, a weekly repeat's rows sharing `series_id`; `blockDates` in
    `@yeral/domain/hours` (a year at most).
  - `GET`/`POST /v1/w/{slug}/calendar/blocks`, `DELETE …/blocks/{id}?scope=one|series` (`calendar/blocks.ts`): the
    `bookings` right decides (a specialist their own), the `calendar` right what the list shows; 5-minute steps up to
    48:00; not wholly in the past; `block_over_bookings` (409, `details.bookings`) when it covers a waiting or confirmed
    booking of theirs on any of its dates (the absolute minutes, so nights past midnight count).
  - Busy time: `loadBusy` gives blocks as `blocked` intervals (`block:{id}`), so every free-time search skips them;
    `planRefusal` names them (`blocked`, with the hours) before "elsewhere" and overlaps; `assertStaffFree` checks
    them under the business row, which a block's save takes (`no key update`).
  - sdk: `calendar.blocks`, `block`, `unblock`.
- Tests: `calendar/blocks.test.ts` (free times, the client's availability, a booking and a move refused, the weekly
  repeat and its removal, over a booking, a week on, the past, a specialist's own and the list, the guard), domain unit
  tests.
- Its review (10; 9 fixed): a confirmed booking brought back can't land on blocked time; a block can't take a
  booking's buffer after it; a move confirmed onto blocked time says `blocked` (`OutsideHours.why`); the overlap query
  reads only the blocks' dates and the days either side; a repeat past a year is refused (`too_big`), not cut short;
  the jobs table keeps its doc comment; one sdk refresh; `assertMayBook` shared, `busyOn` for the past-midnight
  overlap; the dead 48:00 check gone and the guard's test makes its own block. Not taken: blocked time in another
  workspace (busy elsewhere counts bookings only, as breaks and days off there don't count, book Q-272).
- Follow-ups: the calendar day view draws them (B-16, next); the block form isn't designed yet (a **Design to fix** in
  B-18).
