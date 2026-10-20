# Code limits (feat/p2-3-code-limits)

- Changed: P2 step 3 (book Q-267). One internet address may ask for 100 login codes an hour (was 20), since mobile
  operators put many phones behind one address; one phone still 5 (`CODES_PER_ADDRESS`, `CODES_PER_PHONE` in
  `auth/codes.ts`). `rate_limited` carries `retryAfterMin` beside `retryAfterSec` (additive, `retryDetailsSchema`), and
  the message says the wait in minutes in en, tk and ru.
- An hour runs from the first code asked for (`lib/rate-limit.ts`), so the wait is at most an hour.
- Follow-ups: the design draws the message (07c); the tk and ru texts wait for the native review (Q-101).
