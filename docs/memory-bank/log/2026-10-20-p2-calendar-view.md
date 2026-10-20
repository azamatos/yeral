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
    "shown when they book"; a waiting move as `move` (its own row isn't listed).
  - Layers: `blocks` (`blocksBetween`), `elsewhere` (from `loadBusy`, the visit only, no details).
  - The day's line: `daySummary` over what the business earns (`businessTotal` of the items, hidden prices
    included); the `revenue` right decides: everything, a specialist's own items, an administrator none.
  - sdk: `calendar.view`.
- Tests: `calendar/view.test.ts` (the owner's day with a booking, a request, a cancel shown on request, blocked time,
  an internal status and the money; an administrator without money; a specialist's own column and earnings, another's
  403; a week, one person, a personal day off, a waiting move's ghost).
- Follow-ups: drag to move uses the existing move endpoint; the bookings list and search (B-30) next.
