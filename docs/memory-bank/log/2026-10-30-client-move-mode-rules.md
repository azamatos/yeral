# Move mode on the booking's own items, the rules on the confirm step, «Add to calendar» after an instant move (P4 slice 3, C7; feat/client-move-mode-rules)

The client's half of `log/2026-10-30-move-own-services.md` (api #254) and the two leftovers of
`log/2026-10-25-client-move-mode.md`.

- Changed (`pages/booking/ui/move-page.tsx`, book C-30, Q-165): the free-times reads in move mode ask
  `sdk.availability.appointment(slug, { lang, staff, date?, move })` and `…specialists(slug, { lang, move })` without
  `services`: the api reads the booking's own items. The items' `serviceId`s stay for the locked services' names and
  prices (`pickedServices`); the page no longer refuses a move itself when a service left the business's page
  (`picked.length === items.length` is gone): the api's 409 `not_bookable` does. `TimeStep` and `StaffStep` leave
  `services` out when `move` is given. `chosenStaff` stays the client's choice (the booking's specialist, «Any
  specialist» when they left the page, or the one picked).
- The first free-times read (the time step's own, without a day, so the time step's first read is the same request)
  is read as soon as the booking is: `not_bookable` → the existing «This booking can't be moved online.» with a lead
  naming the service («A service of this booking is no longer booked online. Call the business, or cancel and book
  again.»), before the time step; while it's pending the page shows its skeleton, only on the first open (the address
  names nobody yet): a specialist chosen later keeps the step while their times come. The booking's own specialist no
  longer doing its services (404 `not_found` with `details.staffId`, from the read or from `POST …/reschedule`) makes
  the move «Any specialist» (the address's `staff=any`, the time dropped) with a toast saying so («{name} no longer
  does these services. The new time is with any specialist.»); the api never swaps them. Both rules in one place,
  `moveRefusal(error, staff)` (`model/flow.ts`, unit-tested): `'not_bookable' | 'staff_gone' | null`.
- The business's rules on «Confirm the new time» (`ui/rules.tsx`, the block lifted out of `confirm-step.tsx`): the
  free cancel or change window and lateness (book B-41), the business's own note under them; no «Pay at the place»
  (`pay={false}`): the move's board (Booking `isConfirmMove`) draws the two lines only, and a move changes nothing
  about the payment. Not drawn, so not shown: the lead time and the hold as lines of their own (the hold is already
  the «Your previous time is kept until the business confirms.» note).
- «Add to calendar» on the move's sent page after an instant move (`?moved=changed`): the same `.ics` as a sent
  booking's (`useAddToCalendar`, `ui/add-to-calendar.ts`, lifted out of `sent-view.tsx`: `buildIcs` from
  `@yeral/lib/ics`, the file saved by `shared/lib/download.ts`, «The calendar file (.ics) is downloaded.» under the
  buttons), with the new time from the address (`date`/`time`), the services' names, the business and its address.
  Not after `?moved=asked` (the time isn't fixed yet), as the board draws it. «Home» is ghost on both sent pages, as
  drawn.
- `shared/storybook/business.ts`: `moveRead` (`'not_bookable'` or `{ staffGone }`) decides what the free-times reads
  answer in move mode; a read naming neither `services` nor `move` is the api's 400. Stories `Client/Pages/BookingMove`
  (8): the rules on the confirm step and no calendar after a request; «Add to calendar» after the instant move;
  `CantMoveOnline`; `SpecialistGone`.
- Left: nothing of move mode's. The move's sent page reads the booking's services from the business's page
  (`picked`); after an instant move the booking detail in the cache is the mutation's answer, so the two agree.
