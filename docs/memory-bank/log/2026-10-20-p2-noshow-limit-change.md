# A stricter no-show limit doesn't reach back (fix/p2-3-noshow-limit-change)

- Changed: the Q-127 work (#46) recorded that a changed limit applies to every client at once, against the plan
  review's decision of 19.10.2026 (chapter 10: "a lower no-show limit counts from the day it changes"). Now
  `setNoShowLimit()` (`modules/clients/online.ts`, for the settings in step 4, which must change the limit through it)
  makes a stricter limit (lower, or on after 0) start the count again for the clients it doesn't block at that moment,
  judged by the old limit, so those already blocked stay blocked; a looser one applies at once. The limit is checked
  against the domain's options. No new column. A first try kept one business-wide "count from" time; review showed it
  unblocked clients already blocked and didn't cover 0 → N.
- Known leniency: lowering and raising back doesn't bring back the no-shows the lowering set aside for clients it
  didn't block.
- Tests: fixed booking codes in api tests have six digits, so the demo seed's random five-digit codes can't collide
  with them (an occasional flake).
- Follow-ups: the settings endpoint (step 4) calls `setNoShowLimit()`; next in step 3: no review asks (Q-259).
