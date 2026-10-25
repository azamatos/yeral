# A client's move request (P4 slice 3, B5; feat/move-request)

- Changed: a client's move opens in the request drawer as «Time change request» (B-Calendar move-request panel,
  DS-Business MoveRequestBox, book B-21). Under its timer is the box «Time change request»:
  - «Previous time» (the booking's time now, n-600) and «New time» (600), each with «Show» (named «Show the new time»).
    Show takes the calendar to that day as the day buttons do (Back returns). From 1280 the drawer stays open beside
    it; under 1280, where the drawer covers the day, it closes.
  - The line «If you confirm, the booking moves to the new time and the client is notified. If you decline, it stays at
    its time.»
  - It is built from `ChangeSummary` `rows`, which gains a `footer` slot for these lines (and the fit line next).
- The details drop the date and time and «Booking: Confirmed · keeps its time…» for a move, since the box has them; a
  move whose booking can't be read (no previous time) keeps both rows. «Decline» and «Confirm the new time» share
  the footer's width, as on the board (`flex 1 1 0`); a new request's footer does too.
- Already in place from B2–B4: the ghost at the asked time linked to its booking; the move in the pager and the queue
  with its own timer; «Confirm the new time» and its toast «New time confirmed: … · the client is notified»;
  «Decline the new time» with the reason only.
- The fit line (feat/move-fit-line, after W's #227), from the request's `fits` (the confirm's own rule), for someone
  who may answer:
  - «Maral is free at the new time — you can confirm.» (completed ink).
  - «The new time doesn’t fit — you can’t confirm.» (pending ink). It names no one, because `fits` is false for a
    closed business or a block too. «Confirm the new time» is off and points at the line; Decline stays.
  - A move without its box shows the line on its own. Someone who may not answer gets no line, and a new request
    (`fits` null) has none.
  - The sdk reads the requests again on any team change, so a fit that changed with the team shows.
- Decided (Claude, delegated): the board's «Maral isn’t free at the new time» became «The new time doesn’t fit», since
  the api's `fits` doesn't say why.
