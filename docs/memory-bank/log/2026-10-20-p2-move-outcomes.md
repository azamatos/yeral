# Move rules, part 2 (feat/p2-3-move-outcomes)

- Changed: P2 step 3, part 8 (ROUND6 A3, book Q-289). "Haýyşy yzyna al" is `POST /v1/me/bookings/{code}/withdraw-move`
  (`withdrawMove()`, no online check; nothing waiting is nothing to do), with `bookings.withdrawMove` in the sdk. The
  booking detail's `moveRefused` carries the latest move the business declined or let lapse (also before the jobs run),
  with the decline reason, while the booking keeps its time and until another move is asked. A lapsed move sends the
  client `sms.moveRefused` (en, tk and ru drafts), deduplicated per move.
- Follow-ups: the business's decline of a move (step 4) sends the same SMS; activeContext: next token links instead of
  `/b/{code}` and the signed-out link page (Q-168, F-068).
