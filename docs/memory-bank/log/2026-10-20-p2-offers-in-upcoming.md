# Offered times keep a request in Upcoming (fix/p2-3-offers-in-upcoming)

- Changed: P2 step 3, a gap the step's list missed (book C-25 step 6, C-40 step 3). `offersOf(row, now)`
  (`bookings/offers.ts`) is now the one rule for which offered times a request has (decline or expiry, by the
  effective `cancelledBy`), used by the detail, `acceptAlternative` and the list. `withOffersAhead()` keeps a request
  on top of `GET /v1/me/bookings?tab=upcoming` while one of the detail's chips is `free`, soonest offer first; after an
  expiry only while the client may book online, checked with the booking's phone as the detail does. A request that
  ran out keeps its place in Upcoming until the jobs record it.
  The "how" is a 20.10.2026 row in chapter 9.
- Cost: only cancelled appointment rows with an offer not yet started get checked (availability for their offered
  days, as the detail does); one online check per business and phone. Each row with offers ahead runs
  `offeredTimes` (in parallel); a client rarely has more than a few. Rows can move between tabs while someone scrolls
  (offset paging), as they did when a request was answered.
- Follow-ups: the business's decline (step 4) fills `declineAlternatives` and must keep `cancelledBy = 'business'`; an
  undo of a decline should clear `declineReason`, or the detail keeps showing the old decline block. The client app
  (P4) renders a `cancelled` row in Upcoming as one with times to take (its detail has them).
