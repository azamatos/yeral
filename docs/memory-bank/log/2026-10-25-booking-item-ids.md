# A booking's items name their service and specialist (P4 slice 3, for C7; feat/api-booking-item-ids)

- Changed (additive, `/v1`): an appointment's `what.items` in the client's bookings (`BookingSummary`, so My bookings'
  rows, a booking's detail, the sent booking and the SMS link page alike) carry `serviceId` and `staffId` beside the
  names, both nullable as the team's items have them (`teamItemSchema`): null once the service is deleted or the
  specialist removed (the rows' `on delete set null`). Move mode (C-30, `book?move=`) asks the free times by them;
  matching names against the catalogue would break on a rename.
- `apps/api/src/modules/bookings/view.ts` maps them from the item rows; `bookings.test.ts` checks them on the sent
  booking and in the list. The client's story fixtures have them too.
