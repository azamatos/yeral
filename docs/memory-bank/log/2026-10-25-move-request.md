# A client's move request (P4 slice 3, B5; feat/move-request)

- Changed: a client's move opens in the request drawer as «Time change request» (B-Calendar move-request panel,
  DS-Business MoveRequestBox, book B-21). Under its timer is the box «Time change request»:
  - «Previous time» (the booking's time now, n-600) and «New time» (600), each with «Show». Show takes the calendar to
    that day and keeps the drawer open.
  - The line «If you confirm, the booking moves to the new time and the client is notified. If you decline, it stays at
    its time.»
  - It is built from `ChangeSummary` `rows`.
- The details drop the date and time for a move, since the box has them. «Decline» and «Confirm the new time» share
  the footer's width, as on the board (`flex 1 1 0`); a new request's footer does too.
- Already in place from B2–B4: the ghost at the asked time linked to its booking; the move in the pager and the queue
  with its own timer; «Confirm the new time» and its toast «New time confirmed: … · the client is notified»;
  «Decline the new time» with the reason only.
- Waiting: the fit line («Maral is free at the new time — you can confirm.» / «… isn’t free at the new time — you
  can’t confirm.», which also turns Confirm off) needs W's `fits` on the request, not on main yet. Until it lands the
  api refuses a move that doesn't fit, and its message shows in a toast.
