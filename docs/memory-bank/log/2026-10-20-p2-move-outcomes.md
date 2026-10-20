# Move rules, part 2 (feat/p2-3-move-outcomes)

- Changed: P2 step 3, part 8 (ROUND6 A3, book Q-289). "Haýyşy yzyna al" is `POST /v1/me/bookings/{code}/withdraw-move`
  (`withdrawMove()`, no online check; nothing waiting is nothing to do), with `bookings.withdrawMove` in the sdk. A move
  not accepted is kept on the booking (`bookings.move_refused`, migration 0012): the jobs set it when a move lapses (the
  business's decline will in step 4), and a new move, an accepted move or a withdraw clears it. The booking detail's
  `moveRefused` shows it, and a move whose hold just ran out before the jobs run. A lapsed move sends the client
  `sms.moveRefused` (en, tk and ru drafts) while the booking is still ahead. SMS name the calendar day of a time after
  midnight (`confirmed`, `expired`, `moveRefused`). The review's first finding: reading the outcome from the move rows
  broke once an accepted move deleted its row.
- Every path that refuses a move records it with `recordMoveRefused()` (`bookings/repo.ts`): the jobs, a client action
  that finds a lapsed move, and the business's decline in step 4. It counts a move refused before the visit began
  (`refusalCounts()`, judged by when it was refused, which the booking detail uses too); the jobs send the SMS only
  while the visit is still ahead, checked at that moment. The jobs and account deletion lock a booking before its
  move, as every client path does.
- Follow-ups: the business's decline of a move (step 4) calls `recordMoveRefused()` and sends the same SMS; activeContext: next token links instead of
  `/b/{code}` and the signed-out link page (Q-168, F-068).
