# Offered times name one specialist (feat/p2-3-named-offers)

- Changed: P2 step 3, part 5 (book Q-159, Q-252, Q-264). The expiry job offers times that one specialist does whole
  (`oneSpecialist`), the client's own first where they're free (`preferStaffId`), and no longer counts the expiring
  request as busy (it hid the client's own specialist around their own time). Stored offers carry `staffId`; taking one
  books that person only (409 `slot_taken` when they're busy). The booking detail shows each offer with its specialist
  and `state` (`free`, `taken`, `past` by the lead time: `offerPast()`), and `offerTakenBy` with the other offers gone
  once one is taken. With nothing free the expiry SMS asks for another time (`sms.expiredNoTimes`).
- Decided (Claude, delegated; chapter 9): the specialist preference, no split times, offers made before keep going
  to anyone free.
- Follow-ups: the business's decline with offered times (step 4) stores a `staffId` per offer; activeContext: next
  the no-show count restart (Q-127).
