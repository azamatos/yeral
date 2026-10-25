# The request drawer (P4 slice 3, B3; feat/request-drawer)

- Changed: the calendar opens a request in its drawer (`?request=`; B-Calendar «Request», DS-Business BookingDrawer
  `mode="request"`, book B-19; `pages/calendar/ui/request-drawer.tsx`). It opens from three places:
  - The requests chip opens the most urgent one. The chip is a button now and counts every waiting request, as the
    board's queue does; the day's line still counts the day's.
  - A request's block opens that request.
  - A booking with a client's move, or the move's ghost, opens the move by its code.
- The drawer shows:
  - A pager «1 / 2» through the waiting requests, most urgent first.
  - Pending, or Confirmed with the dashed «Time change» tag, and «Online request».
  - The time left to answer, counted while the business is open, with when it runs out: «If no one answers, the
    request is cancelled at 11:38 and the client is offered 3 other times.» While the business is closed it reads
    «Answer by 09:30 tomorrow», with the opening it waits for.
  - The client: name, phone, visits or «New client», and no-shows.
  - The notes shown when they book, each «Note · the whole team sees it».
  - The details (service, specialist, date and time, duration, price, source, sent; a move shows «Booking: Confirmed ·
    keeps its time until the request is answered»).
  - The client's note.
- Confirm (or «Confirm the new time») closes the drawer. Its toast is «Booking confirmed · the client is notified» or
  «New time confirmed: Sun, 25 Oct · 16:00 · the client is notified», with «Next request» while more wait.
- Someone who may not answer reads who does: «The owner and admins answer requests — you can only view them.» or «Aýna
  answers their own requests — you can only view them.»
- A request answered elsewhere, or run out while open, says it isn't waiting any more and offers «Next request».
- The shell's toast (`RequestArrivals`): a request that comes in while any page of the workspace is open says «New
  request: Ejegyz T. · Aýna · today · 15:30» with «Open», which opens it in the calendar's drawer. The ones waiting when
  the page opened stay quiet.
- The contract exports `BookingRequest`.
- Decided (Claude, delegated; chapter 9, 25.10.2026, B-19 (how)):
  - «answers their own requests», not «her own»: the name is any team member's.
  - The chip's name starts with what it shows: «2 requests — open the most urgent» (axe).
  - A move's arrival toast reads «Time change request: Ogulgerek M. · today · 16:00».
  - «Open the client's card» waits for the client card (slice 5).
- Next: B4, the decline modal (`freeTimes(slug, { services, offer: code })`), then B5, the move request's box and fit
  line.
