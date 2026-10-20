# Waiting requests per client (feat/p2-3-waiting-limits)

- Changed: P2 step 3 (book Q-124). A new request waits only while the client has fewer than 3 waiting at the business
  and 10 in all (`waitingLimit`, `MAX_WAITING_HERE`, `MAX_WAITING_IN_ALL` in `@yeral/domain/lifecycle`); otherwise
  409 `too_many_waiting` with `{ scope: 'business' | 'all', limit }` (`tooManyWaitingDetailsSchema`; en, tk, ru
  messages). Waiting = pending, inside its hold, not a move request. Checked in `insertBooking` for every new pending
  booking (new requests, system alternatives), after holding the account row (`for no key update`, the order an
  account deletion locks in), so requests sent at once count one after another.
- Tests: the Q-126 review test's phone moved to an unused number (it shared one with another test).
- Follow-ups: the design draws the refusal on the confirm step (07a C-12).
