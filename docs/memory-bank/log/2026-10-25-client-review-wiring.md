# The review form opens from My bookings (P4 slice 3, C8's wiring; feat/client-review-wiring)

- Changed: G's `features/write-review` (`ReviewModal`, #235) opens from a completed row's «Write a review»
  (`actions.review`; named with its business and time) and from the booking drawer: «Write a review» first with Book
  again beside it (Account-Bookings `actReview`), or «Edit the review» (`actions.editReview`, the detail's `review`,
  while it may change: 7 days). The drawer's status block has «★ 5 · You rated» once reviewed (`.rated`).
- `whatParts` (`entities/booking`, #235) names the visit in the row, the drawer and the sent page in place of their
  own copies; the sent page's address is the shared `addressLine`.
- `apps/client/steiger.config.js` keeps `fsd/insignificant-slice` off for `features/write-review`: the row and the
  drawer are one slice (`pages/my-bookings`); the «How was it?» card (F-243, the home page and My bookings) makes the
  second, then the override goes.
- Stories: `Client/Pages/MyBookings` `WriteAReview`, `Client/Pages/BookingDrawer` `Completed`, `Reviewed`.
- Not here yet: the «How was it?» card (its stars open the form with `rating`); the row's «You rated» (the list's rows
  carry no review).
