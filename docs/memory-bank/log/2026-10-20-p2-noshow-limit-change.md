# The no-show limit: one rule, at once (fix/p2-3-noshow-limit-change)

- Decided: a changed no-show limit applies to every client at once (the block is worked out from the count against
  the current limit, #46). The plan review's "a lower no-show limit counts from the day it changes" (19.10.2026, my
  delegated decision) is dropped. Two tries to keep it, a business-wide count-from time and restarting the count of
  clients a stricter limit doesn't block, each broke under review: they unblocked clients already blocked, mishandled
  0 → N and raise-then-lower, hand blocks, removed no-shows, and races. Chapter 9 and chapter 10 corrected.
- Follow-up for step 4's settings: say how many clients a new limit makes phone-only, or frees, before saving.
- Tests: fixed booking codes in api tests have six digits, so the demo seed's random five-digit codes can't collide
  with them (an occasional flake).
