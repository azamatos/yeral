# My bookings rows carry what their cards offer (slice 3 U4, #215, feat/my-bookings-actions)

- Changed (contract): `GET /v1/me/bookings` answers `MyBooking` rows (`myBookingSchema`): the summary with `holdUntil`
  (a request's answer time), `reschedule` (a waiting move), `decline` (`{ reason, text }`), `offers` (`{ source, times }`:
  the times offered after a decline, an expiry or the business's cancel, as the drawer lists them, free, taken or past;
  null when none show; taken with `accept-alternative`) and `actions`. `bookingActionsSchema`, `waitingMoveSchema` and
  `OFFER_SOURCES` moved up to be shared with the detail (same JSON). Additive.
- Changed (api): `clientSideOf` (`modules/bookings/view.ts`), what a booking offers its client now, shared by the
  drawer (`detailOf`) and the list (`mineOf`); it asks only what the status can have (a review once completed, a
  waiting move while confirmed, the booking an offer became once there are offers) and whether it may be booked online
  only when that matters (a move, an expiry's times). The list loads the page's businesses once.
- API tests (CI): a waiting request, a declined one with an offered time, an expired one, a confirmed one with a move
  waiting; each row's actions, answer time and move equal its drawer's, its offers the drawer's list.
- For C5 (fork K): the card reads `offers.times` for the chips and `offers.source` for `accept-alternative`.

## After the review (one round, 15 findings)

- Fixed: the drawer kept a no-show's review again (the review is read whatever the status); what the rows need is read
  once for the page (`knownFor`: reviews, waiting moves, the bookings offers became, and whether the client may book
  online, once per business and phone from the account's phone); one rule for the offered times inside `clientSideOf`
  (none once taken or from a closed business, after an expiry only online), used by the card and the drawer, and the
  top of Upcoming (`withOffersAhead`) now drops a closed business's too; the rows gain `businessCancel`, `offerTakenBy`
  and `bookOnline`; one `now` for the page; a business without its rules row gives its card without extras instead of
  refusing the page; `all()` instead of an unbounded `Promise.all`; the contract's words say the offers carry every
  state. Tests: the business's cancel with offers and its taking (`offerTakenBy`), a closed business, a reviewed no-show.
- Kept: `withOffersAhead` and the rows each work out a request's offered times (the top of Upcoming needs them before
  the page is cut); the contract change in this PR (additive, needed by C5 at once).
