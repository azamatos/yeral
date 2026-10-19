# The no-show count restarts (feat/p2-3-noshow-restart)

- Changed: P2 step 3, part 6 (book Q-127). The client card's switch (`clients.onlineBlocked`) is the only block on
  online booking; `isOnlineBlocked()` reads it and `reachesNoShowLimit()` says when the count turns it on. The api's
  `modules/clients/online.ts` has `afterNoShow()` (the "Gelmedi" complaint calls it), `setOnlineBlocked()` (the client
  card; off sets `clients.noShowsSince`, so only no-shows marked after it count) and `noShowsSinceReset()`. Migration
  0009 adds the column and switches on the clients the old count blocked (checked on a scratch database).
- Decided (Claude, delegated; chapter 9): a new limit applies from the next no-show on.
- Follow-ups: the complaint and client-card endpoints (step 4) call these helpers; activeContext: next the move rules
  (Q-165, Q-263, ROUND6 A3).
