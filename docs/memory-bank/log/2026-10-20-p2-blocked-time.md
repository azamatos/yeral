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
- Follow-ups: the calendar day view draws them (B-16, next); the block form isn't designed yet (a **Design to fix** in
  B-18).
