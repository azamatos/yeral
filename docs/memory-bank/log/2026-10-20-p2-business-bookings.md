# The team's new bookings (feat/p2-4-business-bookings)

- Changed: P2 step 4 (book B-23, B-24, B-25; F-128, F-129). New module `calendar` (`apps/api/src/modules/calendar`)
  and contract `@yeral/contract/calendar`:
  - `GET /v1/w/{slug}/free-times?services=…&staff=…&date=…`: as the team books (`by: 'staff'`: no lead time, window or
    online switch, never before the step that holds now, `currentStep` in the domain): `nearest` (the first 4 starts
    in 14 days, one per time, each with the first free specialist in the team's order; yesterday's starts past
    midnight first), `slots` for the day with the `staffIds` free at each, `days` (the 14-day strip). Without `staff`,
    everyone who does all the services; a specialist gets their own, another's is 403; a specialist who doesn't do
    them all is `cannot_do`.
  - `POST /v1/w/{slug}/bookings`: `source` phone or walkin, `phone`, `name` (a new client's), `serviceIds`,
    `staffId`, `date`, `start`, `note` (the internal note), `notifyClient` (default on for phone, off for walk-in).
    Confirmed at once; the client record is found by the phone or added (the name typed in, else the account's); the
    booking joins the number's account unless it went unused for 6 months (Q-270) and carries the business's name for
    the client. Issues: `past`, `not_today` (a walk-in), `cannot_do`, `not_found`; a taken time is 409 `slot_taken`
    with the nearest that day. Appointments only.
  - `POST …/bookings/{code}/undo`: within `NEW_BOOKING_UNDO_MS` (10 s, the toast shows 6) a booking the team just added
    is deleted with a client record it made; after it `undo_expired` (new error code, en/tk/ru).
- SMS: a new `booked` kind (`sms.booked`, en/tk/ru, with the address; Q-288) queued at the end of the undo time, under
  the client's confirmations switch; `queueBookingSms` takes `{ first, notBefore }`. The jobs drop an SMS to a number
  the team typed in that isn't a mobile (`DROPPED_NOT_MOBILE`, ROUND6 C1).
- Shared: `appointmentPrice`, `itemRows` and `inTransaction` from `bookings/create.ts`.
- sdk: `calendar.freeTimes/add/undo`; keys `calendar(slug)` and `freeTimes(slug, params)`; booking and settings events
  refresh the calendar.
- Follow-ups: the phone's prefix matches, the known client's card (visits, alert notes, phone-only tag) and the
  client's usual services come with the client card; the business's move and cancel (B-26, B-27) next; "a colleague
  added a booking" (business notifications) with F-170.
