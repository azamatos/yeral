# The no-show count restarts (feat/p2-3-noshow-restart)

- Changed: P2 step 3, part 6 (book Q-127). A client is phone-only at a business when the switch is on by hand
  (`clients.onlineBlocked`) or while the no-shows marked since the business last lifted the block reach its limit
  (`clients.noShowsSince`, migration 0009; a no-show's time is its complaint, else its status change). Worked out at
  each check (`isPhoneBlocked()`, `isOnlineBlocked()`), not stored, so removing a wrong no-show or a limit of 0 lifts
  a block from the count. `setOnlineBlocked()` (the client card) is one update on the current row: on leaves a block
  the count already makes as the count's; off clears the hand block and restarts the count only when the count had
  reached the limit. A no-show's time is when it was marked (`noShowMarkedAt`: the status change, else the complaint),
  shared with the booking timeline. A changed limit applies to every client at once (chapter 9). Note: Drizzle leaves
  the main table's name off its columns, so a correlated subquery spells its columns out (`noShowsSince`).
  The review's first design stored the block when the limit was reached; it couldn't be lifted by Q-207 or a limit of
  0, and raced, so it went.
- Decided (Claude, delegated; chapter 9): the block is worked out, not stored.
- Follow-ups: the client card's endpoint (step 4) calls `setOnlineBlocked()`; activeContext: next the move rules
  (Q-165, Q-263, ROUND6 A3).
