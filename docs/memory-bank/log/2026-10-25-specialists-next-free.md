# The business page's specialists carry their next free time (P4 slice 3, C2's api; feat/specialists-next-free)

- Changed: `GET /v1/businesses/{slug}`'s `specialists[]` gain `nextFree` (`{ date, start }` or null; contract
  `Specialist`, additive): «Next free: Today 15:30» on the page's Specialists (Venue, book C-06 step 4), for the first
  of their services on the page, as the booking's specialist step (`/specialists/availability`) has it; null when
  nothing is free in the window or the page takes no online appointments. Worked out with the card's own next free
  time from the same bookings read, so the page needs no request per specialist.
- Book: chapter 9, 25.10.2026 row «C-06 (how): a specialist's next free time» (Claude, delegated).
- Tests: the business page's test checks Maral's time against the specialist step's (CI; Docker stays off here).
- For the client lane: `GLOW`'s specialists in `apps/client/src/shared/storybook/business.ts` need `nextFree` now.
