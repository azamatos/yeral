# The typical answer time (feat/p2-3-answer-time)

- Changed: P2 step 3 (book Q-113). `bookings.answered_at` (migration 0019) is set when the business answers a request
  (`confirmBooking(…, { answered: true })`; the demo businesses' answers too; declines with the business endpoints,
  step 4). The business page's `typicalConfirmMinutes` is worked out when read: the median of the last 30 days'
  answer times, rounded up to a step, null until 5 answers (`typicalAnswerMinutes`, `@yeral/domain/lifecycle`).
- `businesses.typical_confirm_minutes` is no longer read; a later release drops it (the seed still fills it).
- Bookings answered before this release have no `answered_at`: the line shows from 5 answers on.
- Follow-ups: step 4's confirm and decline endpoints pass `answered: true`.
