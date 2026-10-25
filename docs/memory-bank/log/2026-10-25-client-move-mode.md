# Move mode (P4 slice 3, C7; feat/client-move-mode)

- Changed: `/{lang}/b/{slug}/book?move={code}` (Booking `mode=move`, book C-30; `pages/booking/ui/move-page.tsx`,
  the route's component is now `BookingFlow`, which picks it or the booking flow): «Change the time» with the code,
  the steps Specialist · Time · Confirm (the English is the copy log's, `docs/design/copy/en-choices-patterns.md`,
  «Move mode»). The services are as booked, locked, with their prices and «To change services, cancel the booking and
  book again.»; the specialist the booking is with is chosen and marked «Current» (`StaffStep`'s
  `move`; one no longer on the page leaves «Any specialist»); the new time is among theirs, the booking's own time
  out of the choice with its own specialist or anyone, named «14:30, your previous time» (`TimeStep`'s `move`,
  `isOwnTime`: another specialist at the same time is a move too; both ask the free times with `move=` so the
  booking's own time isn't busy, book Q-165); «Confirm the new time» shows the previous and the new time (and the
  booking's card under 1024), and the
  summary the services locked, «Previous time» muted and «New time» bold (`Summary`'s `move`). A business that confirms
  by hand gets «Request the new time» with «Your previous time is kept until the business confirms.», one that
  confirms at once «Change the time» (`POST …/reschedule`). Sent, the address keeps what was sent (`?moved=asked|changed`,
  the new time in `date`/`time`, the previous one in `was`), so a reload says the same whatever happens next: «Move
  request sent» with the new time waiting, or «Time changed» with the previous time struck through; the business,
  the services, the specialist, the address, the code, «Go to my bookings» and «Home». A time taken meanwhile says
  so, and the time step reads its times again; any other refusal reads the booking again. Signed out: «Log in to
  change the time» with the way back. A booking that can't move here (not a confirmed appointment, past its free
  change time, a service no longer on the business's page) says so with the way to My bookings.
- The drawer: «Move to another time» for a confirmed appointment the api lets move (`actions.reschedule`); with a move
  already waiting, a confirm first («Your earlier request (…) is replaced by the new one.», as drawn).
- Shared in the booking page: `FocusedHeader` (`ui/focused-header.tsx`), `StepTitle`'s `level` (a step's h2 under the
  move's h1). The flow's address has `move` and `moved`; `MOVE_STEPS`, `currentMoveStep` (unit tests).
- Stories `Client/Pages/BookingMove` (5; `moveApi`: the business's page and free times with My bookings' bookings,
  the reschedule among their actions); the drawer's stories check the new button and its confirm.
- Needs #240 (the items' `serviceId`, `staffId`); the drawer's «keeps» line has the copy log's words too.
- Review (`code-review`, one round, 15 findings): fixed the free times read again after `slot_taken`, a chosen time
  checked against the day's free times, a refused move reading the booking again, the sign-in, the sent page from
  its address, the own time only with its own specialist (and named, not a note the board doesn't draw), the hint and
  the times while it sends, «Confirm the new time» with the card under 1024, the previous time not struck before it's
  gone, the locked services' prices, the sent page's details and the instant story, the phone bar's two lines, the
  copy log's words, the moved page kept through the online-booking redirect with its own title, `Summary`'s one
  `whenText`. Left: the business's booking rules on the confirm step, «Add to calendar» after an instant move.
