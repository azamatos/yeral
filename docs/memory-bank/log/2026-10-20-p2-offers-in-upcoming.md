# Offered times keep a request in Upcoming (fix/p2-3-offers-in-upcoming)

- Changed: P2 step 3, a gap the step's list missed (book C-25 step 6, C-40 step 3). `withOffersAhead()`
  (`bookings/offers.ts`) picks the declined and expired requests whose offered times show as chips (appointments, none
  taken, an expiry only while the client may book online) with one still ahead of now plus the lead time (Q-264);
  `GET /v1/me/bookings?tab=upcoming` puts them first, `tab=past` leaves them out until then. The "how" is a 20.10.2026
  row in chapter 9.
- Known: a chip someone else took still keeps the row on top (it shows struck through); finding that out would run
  availability for every row of the list.
- Follow-ups: the business's decline (step 4) fills `declineAlternatives`, which this already reads.
