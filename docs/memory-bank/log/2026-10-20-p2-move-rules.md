# Move rules, part 1 (feat/p2-3-move-rules)

- Changed: P2 step 3, part 7 (book Q-165, Q-263; ROUND6 A3, A5). A move request's items share their booking's
  `family` (migration 0010: the column, the trigger that sets it, the exclusion constraint with `family WITH <>`;
  checked on a scratch database), so a move may overlap the booking's own time with the same specialist. The engine
  leaves the booking's own time out for its move (`excludeBookingId`), and so does the availability endpoint in move
  mode (`?move={code}`, the signed-in client's own booking). A move books the chosen specialist only, or anyone free
  for «Islendik hünärmen», never someone else silently (`rebookQuery()`, no fallback). A move's deadline is capped at
  the original visit's start (`holdCap`). A second move may be asked while one waits (it replaces it).
- Decided (Claude, delegated; chapter 9): the move-mode free times and the database rule.
- Follow-ups: part 2: "Haýyşy yzyna al" (withdraw), the declined or lapsed move on the booking, and its SMS (Q-289).
