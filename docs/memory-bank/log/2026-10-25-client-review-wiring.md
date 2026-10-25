# The review form opens from My bookings (P4 slice 3, C8's wiring; feat/client-review-wiring)

- Changed: G's `features/write-review` (`ReviewModal`, #235) opens from a completed row's «Write a review»
  (`actions.review`; named with its business and time; one form for the page, so the list's refresh after a send
  takes the row's button, not the form, and the focus comes back to the row's link) and from the booking drawer: «Write a review» first with Book
  again beside it (Account-Bookings `actReview`), or «Edit the review» (`actions.editReview`, the detail's `review`,
  while it may change: 7 days). The drawer's status block has «★ 5 · You rated» once reviewed (`.rated`, `@yeral/ui`'s
  `Rating`, heard as «You rated it 5 out of 5»).
- `whatParts` (`entities/booking`, #235) names the visit in the row, the drawer and the sent page in place of their
  own copies, through `myBookings.what` (`useVisitLine`); the drawer's and the sent page's details stay an
  appointment's. The sent page's address is the shared `addressLine`.
- `apps/client/steiger.config.js` keeps `fsd/insignificant-slice` off for `features/write-review`: the row and the
  drawer are one slice (`pages/my-bookings`); the «How was it?» card (F-243, the home page and My bookings) makes the
  second, then the override goes.
- Stories: `Client/Pages/MyBookings` `WriteAReview` (sent from the row, the focus back), `Client/Pages/BookingDrawer`
  `Completed` (sent from the drawer: «5 · You rated», «Edit the review»), `Reviewed`; the fake answers the review.
- Review (`code-review`, one round, 14 findings): fixed the form outliving the row's button, the focus back, the
  details for tables and classes, the visit line's words, the board's star and its spoken label, the stories that
  send, a docblock, the review passed as it is. Left: a refused review re-reading the booking (`ReviewModal` has no
  error hook: G's), the row's «You rated» (the list's rows carry no review: an api field), tables' and classes' lines
  (their flows).
- Not here yet: the «How was it?» card (its stars open the form with `rating`); the row's «You rated» (the list's rows
  carry no review).
