# Move mode reads the booking's own services; a move losing a service is refused (P4 slice 3, api; feat/api-move-own-services)

Two api follow-ups of the client's move mode (book C-30, Q-165; `log/2026-10-25-booking-item-ids.md`,
`log/2026-10-25-client-move-mode.md`).

- Changed (additive, `/v1`): on `GET /v1/businesses/{slug}/availability` and `…/specialists/availability` the
  `services` parameter is optional once `move={code}` is given (the contract refuses a read with neither: 400
  `validation_error` on `services`). Left out in move mode, the booking's own items define the chain: their services
  in the order booked (`bookedServices`, the same source the reschedule books from), with the durations and buffers
  the menu has now, as the reschedule would book them, so the free times and the booking agree. `staff` is optional
  too (default `any` as before): left out in move mode, the booking's own specialist, exactly as the reschedule reads
  a `staffId` left out (`rebookQuery`); one who no longer does the services is 404 `not_found` with `details.staffId`
  on the read as on the reschedule, never a swap: the client asks for `any` or names another. The booking's own time
  and a waiting move (`waitingMove`, now exported) aren't counted busy, as before.
- A move that would lose a service is refused with the existing 409 `not_bookable`, by `POST …/reschedule` and by both
  free-times reads in move mode (whether or not `services` is passed), so the client can say «can't move online»
  before the time step. `BookedServices.lost` marks an item whose service row is gone for good (`serviceId` null:
  a group's or a setup plan's hard delete); `rebookable` / `assertRebookable` (`bookings/engine.ts`) is the one rule,
  used by `rebook` (moves and offered times), the availability's move mode, and the offers: `pickAlternatives` offers
  nothing for a booking that can't be re-booked as it was (an expiry, a decline, a close, a specialist away) and
  `offeredTimes` shows an earlier offer as taken, so no chip is ever shown that can't be taken (the review's finding).
- **The rule for an archived service** (deleted by the business, keeps its row): refused the same way, `not_bookable`,
  and so is a service switched off from online booking. The api already refused both on the reschedule (book Q-210:
  nothing new is booked with a deleted service; a move is an online booking), and the client treats a service the
  business's page no longer lists as «can't move online» (the item-ids note); the page lists neither, so the api's
  rule now matches the client's on every read: a move needs every booked service on the menu and bookable online.
  An offered time (after a decline or an expiry) needs them on the menu, online or not: it's taken, not booked online.
- Tests (`bookings/moves.test.ts`): move mode without `services` or `staff` equals the read with the booking's
  services and specialist passed, and the reads outside move mode still need `services`; the own specialist no longer
  doing the service is `not_found` on the read as on the reschedule; a service gone for good is refused by the
  reschedule and both reads, the booking untouched with both its items; an archived and an offline service refused
  the same way. `offers.test.ts`: a request whose service is gone expires with nothing offered; offers made before
  show taken and can't be accepted (`not_bookable`).
- For the client agent (move mode's rules on the confirm step, «Add to calendar»): the api needs only
  `sdk.availability.appointment(slug, { lang, date, move: code, staff })` and `sdk.availability.specialists(slug,
  { lang, move: code })`; `services` may go, and so may `bookedFrom`'s rebuild from the items' `serviceId` (the sdk's
  `enabled` is true with `move` alone). `staff` stays the client's choice as today (`chosenStaff`: the booking's
  specialist, «Any specialist» when they left the page, or the one picked); left out, the api reads the booking's own
  and answers `not_found` with `details.staffId` when they no longer do the services, the same as the reschedule
  would, so the time step and the confirm step never disagree. A booking that can't move online: `not_bookable` from
  the free-times read (and `invalid_status` / `reschedule_closed`… as before for the state); the client may show its
  «can't move online» page on it instead of checking the catalogue itself. The `serviceId`s stay useful for the
  locked services' names and prices.
- Docs: `docs/API.md` (the free-times row). No migration.
