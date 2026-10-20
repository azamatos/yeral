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
- Review (15; 13 fixed, 2 kept): a request without an answer time fell off every tab (SQL null; now `ranOutAt`,
  never null, beside `awaitingAnswer`); Today was the calendar date, not the business day (now
  `currentBusinessDate`); the CSV printed 25:00 past midnight (now `fmt.timeRange`); a bad cursor was a 500 (the
  contract's cursor is now digits); the tests could match a seeded code (now a name); the export can take the rows
  ticked (`codes`); app and web both "Online"; the phone without its "+"; the response says how many matched
  (`X-Total-Count`); the search finds the client's name on the card too; semicolons where decimals take a comma;
  one `phoneLike` and one `groupBy`; a page past the end counts again. Kept: administrators get the price and
  amount columns (prices are booking information, design §28, the owner's rule; sums stay the owner's on screens),
  and "New" stays off before a first visit (the owner's correction in design round 3).
- Follow-ups: the list's Haýyşlar tab stays `/requests` (most urgent first); bulk answers loop the single ones.
