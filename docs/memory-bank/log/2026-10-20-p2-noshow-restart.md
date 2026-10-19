# The no-show count restarts (feat/p2-3-noshow-restart)

- Changed: P2 step 3, part 6 (book Q-127). A client is phone-only at a business when the switch is on by hand
  (`clients.onlineBlocked`) or while the no-shows marked since the business last lifted the block reach its limit
  (`clients.noShowsSince`, migration 0009; a no-show's time is its complaint, else its status change). Worked out at
  each check (`isClientBlocked()`, `isOnlineBlocked()`), not stored, so removing a wrong no-show or a limit of 0 lifts
  a block from the count. `setOnlineBlocked()` (the client card) restarts the count only when the client was blocked.
  The review's first design stored the block when the limit was reached; it couldn't be lifted by Q-207 or a limit of
  0, and raced, so it went.
- Decided (Claude, delegated; chapter 9): the block is worked out, not stored.
- Follow-ups: the client card's endpoint (step 4) calls `setOnlineBlocked()`; activeContext: next the move rules
  (Q-165, Q-263, ROUND6 A3).
