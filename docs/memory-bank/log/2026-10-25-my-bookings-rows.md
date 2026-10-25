# My bookings rows carry what their cards offer (slice 3 U4, feat/my-bookings-actions)

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
