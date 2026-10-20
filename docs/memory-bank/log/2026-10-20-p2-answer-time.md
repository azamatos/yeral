# The typical answer time (feat/p2-3-answer-time)

- Changed: P2 step 3 (book Q-113). `bookings.answered_at` (migration 0019, with a partial index for the read) is set
  whenever the business confirms a request: `confirmBooking` counts it unless the caller says `instant` (only the
  instant path in `create.ts` does), so step 4's endpoints can't forget; a move request's answer isn't counted (its row
  goes into the booking). Declines set it with step 4.
- The business page's `typicalConfirmMinutes` is worked out when read (`typicalAnswerMinutes`, `openMinutesBetween` in
  `@yeral/domain`): the median of the last 30 days' waits, the answered requests and those let run out (at the wait
  the client had), in open minutes; null until 5 answers, and for an instant business.
- The seed records its bookings' answers (ten minutes after sending); `businesses.typical_confirm_minutes` is no longer
  read or seeded, and a later release drops it.
- Known: a request brought back with "Yzyna al" keeps its first send time.
- Follow-ups: step 4's decline endpoint sets `answered_at` too.
