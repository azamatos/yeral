# The business page's specialists carry their next free time (P4 slice 3, C2's api; feat/specialists-next-free)

- Changed: `GET /v1/businesses/{slug}`'s `specialists[]` gain `nextFree` (`{ date, start }` or null; contract
  `Specialist`, additive): «Next free: Today 15:30» on the page's Specialists (Venue, book C-06 step 4), for the first
  of their services on the page (`serviceIds`, now in the page's order), as the booking's specialist step
  (`/specialists/availability`) offers it; null when nothing is free in the window, online booking is paused or the
  page takes no appointments; the owner's preview shows it as clients will see it, as the card does.
- One helper for «the next free time»: `nextFreeFor(ctx, serviceIds, staffId)` in `availability/context.ts`, used by
  the page (its card and each specialist) and the specialist step. For one specialist it reads only their own busy
  times, so a page with many specialists costs about one search, not one per specialist over every booking.
- Fixed on the way: the card's «Next free time» took the first online service by its sort alone, and each group's sort
  starts at 0, so it could be any group's first; it's now the first service on the page (by group, then within it).
- Book: chapter 9, 25.10.2026 row «C-06 (how): a specialist's next free time» (Claude, delegated).
- Tests: the business page's api test checks Maral's time against the specialist step's for her first service on the
  page, the card's against the step's «any», and a paused page's times are null (CI; Docker stays off here, as agreed).
- The client lane's `GLOW` fixture (`apps/client/src/shared/storybook/business.ts`) has `nextFree` on its specialist;
  fixtures for more specialists need it too.
