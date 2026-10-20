# The calendar day and week view (feat/p2-calendar-view)

- Changed: P2 step 4, book B-16, B-17 (design COMPONENTS CalendarGrid, BookingBlock, ScheduleLayers,
  InternalStatusChip).
- How (chapter 9, 20.10.2026, Claude (delegated)):
  - `GET /v1/w/{slug}/calendar?date&days=1|7&staff&cancelled&lang` (`calendar/view.ts`): the `calendar` right
    decides whose columns and bookings (a specialist their own; `staff` narrows it, another's is 403).
  - Columns: the bookable team (and the reader's own row), each day's `working`, `breaks` and `off`
    (`staffDay`, `staffOffReason`); someone removed with kept bookings keeps a column (`removed`).
  - Bookings: the effective status, cancelled ones only with `cancelled=true`, the night before's when it runs past
    midnight; items with their buffers; the internal status only while switched on; `alert` from the client's notes
    "shown when they book"; a waiting move's asked time as `move` (its own row isn't listed; its ghost is in `moves`).
  - Layers: `blocks` (`blocksBetween`), `elsewhere` (`loadElsewhere`, the visit only, no details).
  - The day's line: `daySummary` over what the business earns (`businessTotal` of the items, hidden prices
    included); the `revenue` right decides: everything, a specialist's own items, an administrator none.
  - sdk: `calendar.view`.
- Tests: `calendar/view.test.ts` (the owner's day with a booking, a request, a cancel shown on request, blocked time,
  an internal status and the money; an administrator without money; a specialist's own column and earnings, another's
  403; a week, one person, a personal day off, a waiting move's ghost).
- Its review (10, all fixed; one in #94): waiting moves only while their answer time runs (`awaitingAnswer`);
  `moves` gives each ghost on the day and person it asks for, whether or not its booking is in view, with the
  booking's time now (`of`); one person's view counts only their part of a shared booking's money; a column of one's
  own only for a specialist; busy elsewhere read on its own (`loadElsewhere`, out of `loadBusy`); the day before's
  layers only when they run past midnight; `boolQuery` shared in `@yeral/contract/common`; the sdk refreshes the
  calendar when a request is answered (and with the statuses, in #94); items grouped once, the off reason only when
  off, a sub-select instead of DISTINCT.
- Second review (10; 8 fixed): a ghost asked past the last day in view leaked into `moves` (test added); the sdk
  refreshes the calendar on a team change (its columns); the business, bookings, ghosts, time elsewhere (now for
  the person in view only) and markers read at once; lists grouped in place, Sets for ids; the team's item and
  price shared with the requests (`bookings/team-view.ts`); a booking's `move` is the asked time only, its ghost
  in `moves`; the helpers table and this note. Not taken: the team seeing prices hidden from clients (it charges
  them), and busy elsewhere up to a minute stale (the view is read, not booked against).
- Follow-ups: drag to move uses the existing move endpoint; the bookings list and search (B-30) next.
