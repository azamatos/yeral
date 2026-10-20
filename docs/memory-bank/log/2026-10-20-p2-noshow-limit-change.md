# A lowered no-show limit counts from the day it changes (fix/p2-3-noshow-limit-change)

- Changed: the Q-127 work (#46) recorded that a changed limit applies to every client at once, against the plan
  review's decision of 19.10.2026 (chapter 10: "a lower no-show limit counts from the day it changes"). Now
  `setNoShowLimit()` (`modules/clients/online.ts`, for the settings in step 4) sets `booking_rules.no_shows_count_from`
  when the limit goes down (migration 0016); the count only takes no-shows marked after it. Raising it, or 0, lifts
  blocks from the count at once. Chapter 9's Q-127 row and chapter 7c corrected.
- Tests: fixed booking codes in api tests have six digits, so the demo seed's random five-digit codes can't collide
  with them (an occasional flake).
- Follow-ups: the settings endpoint (step 4) calls `setNoShowLimit()`; next in step 3: no review asks (Q-259).
