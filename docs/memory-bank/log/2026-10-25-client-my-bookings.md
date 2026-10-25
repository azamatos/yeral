# My bookings (P4 slice 3, C5; feat/client-my-bookings)

- Changed: `/{lang}/account/bookings` (`pages/my-bookings`, route `account/bookings.tsx`; `/account` opens it, the
  account's aside has «My bookings» first): the tabs Upcoming and Past (`?tab=past`, Radix tabs with both panels in the
  page), #215's rows 12 at a time with «Show more», each tab's empty state, the error with Try again.
- A row (`ui/booking-row.tsx`, Account-Bookings `.brow`, book C-23–C-31, C-40): the business's photo, name, what
  (services · specialists), when (struck through once cancelled; a start past midnight on the next date), the status
  (`entities/booking` `BookingStatusBadge`: the five statuses' icons and words, used by the sent page too), a request's
  `TimerPill` to its answer time, who cancelled («You cancelled», «The business declined» / «cancelled», «No answer in
  time»), a waiting move, the decline's or the business's cancel's reason (the shared words) with its text, the booking
  an offered time became, the price; Undo (`restore`, the shared «Couldn't undo — …» reasons) and Book again. Offered
  times (a decline's, an expiry's, a business cancel's) as chips, taken ones struck with «Already taken»; a tap opens
  «… book this time?» (a Popover named by its line) and Book takes it (`accept-alternative`; after an expiry it's a
  new request).
- Live updates: the site starts `startEvents()` in the browser (the root document's effect; ADR 0028's stream with
  the poll behind it), so the business's answer shows without a reload.
- `shared/storybook/my-bookings.ts`: `myBookingsApi()` with `MY_BOOKINGS` (each kind of row; `refuse` fails Undo and
  taking a time); stories `Client/Pages/MyBookings` (6). The header's account menu and its phone sheet open My bookings
  first too.
- Review (`code-review`, one round, 15 findings): the request's line is the drawn «Waiting for the business to confirm»
  (no timer; a no-show says so too); Call (`tel:`) on every row still ahead and for a client booked by phone only; a
  phone booking's phone icon; Undo named with its business and time, loading, and its failure said in the row with
  «Choose another time» (Undo gone); a time taken a moment before says so and reads the list again, an expired
  request's new booking toasts by its status; offered times all passed say so with the way to the page; the time
  struck only while offered times stand in for it, the photo dimmed only after the client's own cancel; the words by
  where the time came from («Offered time accepted» / «New request sent»), the expiry's chips «Free times», the
  decline's caption. Left: the tabs' counts (the list has no `total` yet); the status icons repeat the business app's
  and belong in `@yeral/ui`'s `StatusBadge` later.
- Not here yet: opening a booking (C6, the drawer at `/account/bookings/{code}`), the review and «How was it?» (C8),
  Directions on a row (the list's rows carry no address; the drawer has it).
