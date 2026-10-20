# Waiting requests per client (feat/p2-3-waiting-limits)

- Changed: P2 step 3 (book Q-124). A request waits only while the client has fewer than 3 waiting at the business and
  10 in all (`waitingLimit`, `MAX_WAITING_HERE`, `MAX_WAITING_IN_ALL`, `WAITING_SCOPES` in `@yeral/domain/lifecycle`);
  otherwise 409 `too_many_waiting` with `{ scope, limit }` (`tooManyWaitingDetailsSchema`; en, tk, ru messages).
- Waiting = `awaitingAnswer(now)` in `bookings/repo.ts` (pending, inside its answer time), the same rule the
  workspace's request counter uses; move requests don't count. `assertWaitingRoom` runs wherever a request starts
  waiting: a new one and an offered time taken (an early check before the time is placed, then a locked one at the
  insert) and a restored one ("Yzyna al"). The locked check holds the account row first (`for no key update`, the
  order an account deletion takes), so requests at once count one after another, and a deleted account gets 401.
- Tests: the Q-126 review test's phone moved to an unused number (it shared one with another test); the Q-124 tests
  clean up their rows, since later tests in the file run the jobs.
- Follow-ups: the design draws the refusal on the confirm step (07a C-12); the business's undo of a decline
  (ROUND6 A6, step 4) calls `assertWaitingRoom` too.
