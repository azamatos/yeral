# Slice 3's small leftovers: the tabs' counts, the «Call» link's name, the «Confirm Request» flake (fix/slice-3-leftovers)

Closes three leftovers of `log/2026-10-30-how-was-it-card.md`, `-my-bookings-review-total.md` and
`2026-10-25-client-review-wiring.md`. No api or contract change.

- **The tabs' counts on My bookings** (`apps/client`, `pages/my-bookings`): Upcoming and Past carry how many bookings
  each holds (Account-Bookings draws `{{t.n}}` in every tab, 0 included; `TabsTrigger count`, the count part of the
  tab's name: «Upcoming 5»), the number through `useFmt().number`. The count is the list's `total` (#252, every page
  repeats it), so the page reads both tabs' lists (`sdk.bookings.list('upcoming' | 'past', lang)`): the other tab's
  first page comes too, and the tab switch is instant. Nothing shows while a list loads or has failed. Stories:
  `Upcoming` («Upcoming 5» selected, «Past 4»), `Past` (clicks «Past 4»), `Empty» («Upcoming 0», «Past 0»).
- **The «Call» link's accessible name** (`booking-row.tsx`, and the drawer's twin in `booking-drawer.tsx`, the same
  page slice): named from what it shows instead of an `aria-label`. The messages `myBookings.callLabel` and
  `bookingDrawer.callLabel` became rich: `"Call<hidden> {business}</hidden>"` / `"Call<hidden> {business}: {phone}</hidden>"`,
  rendered with `t.rich` and `<hidden>` as a `sr-only` span, so the visible word («Call», or «Call жжжж» under Storybook's
  «Text: Russian length») is always the start of the name, in every language: the right fix for axe's
  `label-content-name-mismatch`, which an `aria-label` can't give once the visible word and the label stretch apart
  (the stretch adds its filler after the whole message, outside the tag). Story `Client/Pages/MyBookings` `LongWords`
  (390, «Text: Russian length»): the tabs' counts stay numbers, the «Call» link's name starts with its word, nothing
  overflows; without the row fix the story fails on axe (checked). `myBookings.call` went with the two links (the
  business page's «Call» is `business.call`, untouched).
- **The flaky «Confirm Request» story** (`Business/Calendar/Day`, `calendar-page.stories.tsx`): not a race in the UI.
  The failed run (main at e9f4a0e, 2026-10-25 18:55 UTC = 23:55 in the market's zone) shows the cause: the waiting
  request's hold is 18 minutes from the real clock (`now + 18 * 60_000`), and past 23:42 Ashgabat it runs out
  tomorrow, so the drawer's sentence reads «cancelled at 00:13 tomorrow …» (`calendar.request.at`, the `tomorrow`
  branch) and the story's regex `at \d\d:\d\d and` didn't match. The story now expects the sentence the drawer builds,
  through `runsOutAt(holdUntil)` (`hm` of the hold's local time, «tomorrow» appended when its date isn't today's):
  deterministic at any time of day, no timeout or retry. The other time-of-day assertions in the file don't branch on
  the day (`ClosedNow`'s «Answer by HH:MM» is the block's `byLabel`, time only). Ran the file four times locally after
  the change: green; the midnight case can't be forced without faking the clock the page reads (`useClock`), so the
  helper mirrors the drawer's rule instead.
- Not here: the home page's copy of the «How was it?» card (slice 5); the drawer's Call link under stretched words has
  no story of its own (the page's `LongWords` covers the rows; the drawer's is the same markup); one `onError` re-read in
  the sdk for every refused booking action (`log/2026-10-30-how-was-it-card.md`).
