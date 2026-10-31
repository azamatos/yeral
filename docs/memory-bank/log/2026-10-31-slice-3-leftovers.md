# Slice 3's small leftovers: the tabs' counts, the rows' action names, the «Confirm Request» flake (fix/slice-3-leftovers)

Closes three leftovers of `log/2026-10-30-how-was-it-card.md`, `-my-bookings-review-total.md` and
`2026-10-25-client-review-wiring.md`. No api or contract change.

- **The tabs' counts on My bookings** (`apps/client`, `pages/my-bookings`): Upcoming and Past carry how many bookings
  each holds (Account-Bookings draws `{{t.n}}` in every tab, 0 included; `TabsTrigger count`, the count part of the
  tab's name: «Upcoming 5»), the number through `useFmt().number`. The count is the list's `total` (#252, every page
  repeats it), so the page reads both tabs' lists (`sdk.bookings.list('upcoming' | 'past', lang)`): the other tab's
  first page comes too (12 rows for one number: the price of no lighter endpoint; an api `totals` for both tabs would
  spare it, a follow-up if it shows), and the tab switch is instant. Both lists stay subscribed, so a switch no longer
  mounts a fresh observer: `switchTo` reads the chosen list again when it's stale, as a mount did. The last list stays
  while the language changes its key (`placeholderData: keepPreviousData`): no tab without its count for a round-trip.
  Nothing shows while a list loads the first time or has failed without data. Stories: `Upcoming` («Upcoming 5»
  selected, «Past 4»), `Past` (clicks «Past 4»), `Empty` («Upcoming 0», «Past 0»).
  **Found by the e2e job (#258's flow «declines with two offered times»), not by the stories:** the sdk's `settle`
  reads the lists again and TanStack waits for it before a `mutate` call's own callbacks; with both lists subscribed
  the Upcoming one comes back first, the row re-renders without its offers, `OfferTimes` unmounts, and its «Booked:
  …» toast (a `mutate`-level `onSuccess`, dropped on unmount) never showed. Fixed in `offer-times.tsx`: the callbacks
  sit on the mutation itself (`useMutation({ ...base, onSuccess, onError })`, calling the sdk's `onSuccess` after the
  toast), which run whatever happens to the component. The same hazard waits in any component that leaves the screen
  on its own success and toasts from a `mutate` callback (the review form over the «How was it?» card may be one; its
  stories pass): worth one look across the client's booking actions with the sdk `onError` follow-up.
- **The rows' action names under stretched words** (`booking-row.tsx`; the drawer's Call in `booking-drawer.tsx`, the
  same page slice): the «Call» link, Undo, «Write a review» and «Edit the review» are named from what they show instead
  of an `aria-label`: the messages `myBookings.callLabel`, `undoLabel`, `writeReviewLabel`, `editReviewLabel` and
  `bookingDrawer.callLabel` are rich (`"Call<hidden> {business}</hidden>"`, `"Undo<hidden> {business}, {when}</hidden>"`…),
  rendered with `t.rich` and `<hidden>` as a `sr-only` span (`hidden` in `booking-row.tsx`), so the visible word is
  always the start of the accessible name, in every language: the right fix for axe's `label-content-name-mismatch`
  (the hidden part starts with a space, no colon: an absolutely positioned span is a block to the name's
  computation, which puts a space around it, so «Undo: …» would read «Undo : …»),
  which an `aria-label` can't give once the visible word and the label stretch apart (`stretchText` adds its filler
  after the whole message, outside the tag; in a real language the label would start with the word as well). The
  visible-only keys `myBookings.call`, `undo` and `writeReview` went (`editReview` stays: the drawer's button reads it).
  Stories `Client/Pages/MyBookings` `LongWords` (Upcoming at 390 with «Text: Russian length»: the counts stay numbers,
  the «Call» link's name starts with its word, nothing overflows; without the row fix the story fails on axe, checked)
  and `LongWordsPast` (Undo, «Write a review», «Edit the review»); `Client/Pages/BookingDrawer` `PastFreeCancelLongWords`
  (the drawer's Call). The business page's Call links (`pages/business`: `booking-card.tsx`, `about.tsx`) have the same
  `aria-label` pattern and would trip the same rule under stretched words: a follow-up in that slice, the same way.
- **The flaky «Confirm Request» story** (`Business/Calendar/Day`, `calendar-page.stories.tsx`): not a race in the UI.
  The failed run (main at e9f4a0e, 2026-10-25 18:55 UTC = 23:55 in the market's zone) shows the cause: the waiting
  request's hold is 18 minutes from the real clock (`now + 18 * 60_000`), and past 23:42 Ashgabat it runs out
  tomorrow, so the drawer's sentence reads «cancelled at 00:13 tomorrow …» (`calendar.request.at`, the `tomorrow`
  branch) and the story's regex `at \d\d:\d\d and` didn't match. The regex now allows the optional « tomorrow»:
  deterministic at any time of day, no timeout or retry, and nothing of the drawer's rule copied into the test (a
  helper mirroring it was the first version; the review preferred the regex, which can't drift). The other time-of-day
  assertions in the file don't branch on the day (`ClosedNow`'s «Answer by HH:MM» is the block's `byLabel`, time
  only). The file ran six times locally: green; the midnight case can't be forced without faking the clock the page
  reads (`useClock`).
- Review (`code-review`, one round, 6 findings): the stale tab on a switch (fixed, `switchTo`), the other row actions
  with the same `aria-label` pattern (fixed for the rows; the business page's are the follow-up above), the count
  flashing on a language change (fixed, `keepPreviousData`), the helper duplicating the drawer's rule (the regex
  instead), the drawer's Call without a stretched story (added). Not taken: a lighter api answer for the counts (an api
  change, out of this PR's scope; noted above), and fixing the stretch tool so labels and their words stretch alike
  (the stretch can't know which message a label's word comes from; naming from content is the fix that holds in real
  languages too).
- Not here: the home page's copy of the «How was it?» card (slice 5); one `onError` re-read in the sdk for every refused
  booking action (`log/2026-10-30-how-was-it-card.md`).
