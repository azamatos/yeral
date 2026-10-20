# The bookings list and its export (feat/p2-bookings-list)

- Changed: P2 step 4, book B-30, B-31, F-135 (chapter 9 how-row, 21.10.2026, Claude (delegated)).
  - `calendar/list.ts`: `whereOf` (the tab with a request run out counted cancelled before the jobs settle it, the
    reader's reach, `staff`, `service`, `from`/`to`, the search over code, name and number digits), `orderOf`,
    `bookingList` (paged in SQL with `count(*) over ()`; "New" from `clientFacts` with `scope: 'business'`),
    `exportBookings` (calendar `all` only; `EXPORT_MAX` rows; i18n headers, sources, statuses and who cancelled;
    `cell()` quotes and keeps formula-like names as text; a byte-order mark).
  - Routes `GET /w/{slug}/bookings` and `GET /w/{slug}/bookings/export` (`text/csv`, `Content-Disposition`).
  - Contract `BOOKING_TABS`, `bookingFiltersSchema`, `bookingListQuerySchema`, `bookingRowSchema`,
    `bookingListSchema`; i18n `sources`, `cancelledBy`, `bookingsExport` (en, tk, ru).
  - sdk `calendar.bookings` (infinite, under the calendar's key), `calendar.exportUrl`.
- Tests: `calendar/list.test.ts` (each tab's rows and order, who cancelled, a request run out, "New"; search by
  code, name and number; filters; pages; a specialist's own, another's column 403, no export; the CSV's headers in
  English and Turkmen, the byte-order mark, a formula-like name kept as text, price and amount).
- Follow-ups: the list's Haýyşlar tab stays `/requests` (most urgent first); bulk answers loop the single ones.
