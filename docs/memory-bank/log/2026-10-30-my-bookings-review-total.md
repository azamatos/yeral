# My bookings rows carry their review, the list its total (slice 3 api follow-up, feat/api-my-bookings-review-total)

Closes two api follow-ups of `log/2026-10-25-client-review-wiring.md` and `-my-bookings-rows.md`. Additive on `/v1`.

- Changed (contract): the detail's inline review object is now `bookingReviewSchema` (`BookingReview`, OpenAPI id
  `BookingReview`: `{ rating: int, tags: string[], text: string | null, createdAt: epoch ms }`), reused as it was by
  `bookingDetailSchema.review` and newly by `myBookingSchema.review` (`MyBooking`, the rows of `GET /v1/me/bookings`):
  **`review: BookingReview | null`**, required, null until the visit is reviewed. Whether it may still change (7 days)
  stays `actions.editReview`, as in the detail. The list is now `myBookingListSchema` (`MyBookingList`, OpenAPI id
  `MyBookingList`; it was `bookingListSchema`, a name the calendar's list has too, OpenAPI id `BookingList`) and
  requires **`total: int`**: how many bookings the tab holds in all, whatever the page (the tabs' counts; `cursor`
  null on the last page). The api answered `total` already (`picked.length`); the contract and the tests now promise it.
- Changed (api): `mineOf` (`modules/bookings/view.ts`) maps the review `knownFor` already read once for the page (no
  query per row), through `reviewOf`, shared with `detailOf`; a business without its rules row still gives its review.
- Tests (api): a row's review equals its drawer's for every row `both` compares (`offers.test.ts`), a reviewed no-show's
  included; a completed visit's row says `review: null` until it's reviewed, then carries the review the detail answers
  (`bookings.test.ts`); `total` per tab, the same on each page (`limit=2`, then `cursor=2`).
- Client fixtures (`apps/client/src/shared/storybook/my-bookings.ts`): the row base has `review: null`, the fake list
  answers `total`, the fixture's `detailOf` takes the row's review instead of always null, and a review sent through
  the fake changes the row with the drawer (`changed`, per code), as the api does; the `Reviewed` drawer story puts the
  review on the row (`lists`), not only on the detail.
- Review (`code-review`, one round, 5 findings): the list's own name and OpenAPI id, the fake's row after a review,
  the `Reviewed` story's row, the paging test walking every page; the hot-spot split was the brief's call (one small
  PR, contract and api together).
- For the client agent (the row's «★ 5 · You rated», the «How was it?» card F-243): read `row.review` (`rating`, `tags`,
  `text`, `createdAt`); a completed visit with `review === null` and `actions.review === true` still lacks one; the
  tab's count is `pages[0].total` of `sdk.bookings.list(tab, lang)` (every page repeats it). Nothing changed in the
  sdk: the list's infinite query already answers the contract's shape.
