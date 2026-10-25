# A booking's items name their service and specialist (P4 slice 3, for C7; feat/api-booking-item-ids)

- Changed (additive, `/v1`): an appointment's `what.items` in the client's bookings (`BookingSummary`: My bookings'
  rows, a booking's detail, the sent booking, «How was it?») are the team's items (`teamItemSchema`, mapped by
  `teamItemOf`): `serviceId` and `staffId` beside the names. Move mode (C-30, `book?move=`) asks the free times by
  them; matching names against the catalogue would break on a rename.
- What the ids mean: a service the business deletes is archived and keeps its id, as a specialist removed from the
  team keeps theirs (their row stays, not bookable); null only once the row itself is gone (`on delete set null`, a
  group's or a setup plan's hard delete). So the client checks them against the business's catalogue: a service it
  no longer lists, or a specialist it no longer lists, means «can't move online» or «any specialist».
- The SMS link page (`bookingLinkSchema`, signed out) shows the names only (`bookingLinkWhatSchema`): the ids are for
  a move, which needs the account.
- Tests: `bookings.test.ts` (the sent booking's ids, the list's row the same as the booking), `links.test.ts` (no ids
  on the link page), `menu.test.ts` (a deleted service's booking keeps its id). The client's story fixtures have them,
  their items in the order sent and at the booking's own time.
- Review (`code-review`, one round, 14 findings): fixed the ids' meaning (comments, this note), the reuse of
  `teamItemSchema` and `teamItemOf`, the link page, the tests (and the specialist's id checked against the booking,
  not a lookup that depends on the rows' order), the fixtures. Left as follow-ups: the availability endpoint could
  read the moved booking's own services and specialist in move mode (`move=` with `services` optional), so the
  client wouldn't rebuild `bookedFrom`; and `bookedFrom` drops an item whose service is gone for good, so moving such
  a booking would re-book it with fewer services: a move should refuse it (`not_bookable`). The client's move mode
  refuses it on its own (C7).
