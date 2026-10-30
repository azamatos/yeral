# The «How was it?» card, the row's «You rated», the review form's refusal (P4 slice 3, C5/C8; feat/client-how-was-it)

Closes the client leftovers of `log/2026-10-25-client-review-wiring.md` on the api of #252 (`row.review`, `total`).

- Changed: `features/write-review` gains the **«How was it?» card** (`ui/how-was-it-card.tsx`, `HowWasItCard`; book
  F-243, Q-259, chapter 9 21.10.2026): it reads `sdk.bookings.howWasIt(lang)` itself (`GET /me/how-was-it`: the
  latest completed visit still open to a review, without one, its card not closed; one card at a time, as the book
  says), draws the business (photo 48 or its letters), the visit («Women’s haircut · Aýna · Fri, 23 Oct», `whatParts`
  with the short date, as the review modal's head) and `RatingInput`'s five stars; a star pressed opens `ReviewModal`
  with that `rating`; «Later» empties the stars and gives the focus back to the one pressed; sent, the sdk refreshes
  the card (it goes, or the visit before it asks) and the lists. The cross closes it for good for that visit
  (`sdk.bookings.closeHowWasIt()`, one tap, the book's rule; its failure toasts); no «Later» button (nothing drawn
  or written asks for one). Nothing renders while it loads, when the api fails or when there's no visit. Drawn after
  the nearest patterns: the calm info card (`Callout layout="card"`: white, n-200 line, r16, pad 24; 20 on phones)
  with the review modal's head inside; the stars' row wraps its word under them at 390. It lives in the
  write-review slice (the review's other way in, beside «Write a review»), so the home page mounts it in slice 5 with
  `import { HowWasItCard } from '@/features/write-review'` and `<HowWasItCard className="…" />`; the card needs
  nothing else (its own query; signed out, the api's 401 makes it render nothing, though home may want to mount it
  only for a signed-in person, `sdk.me.get()`, to spare the request). Props: `className`, `returnFocus` (where the
  focus goes once the form closes and the stars are gone), `onDone(detail)`.
- My bookings (`pages/my-bookings`): the card under the title, whatever the tab; after a send the focus goes to the
  reviewed row's link when it's on the screen. A row with `review` shows «★ 5 · You rated» (`Rating`, heard as «You
  rated it 5 out of 5», the drawer's `.rated` block) and, while `actions.editReview` (7 days), a ghost «Edit the
  review» that opens the page's one form on the written review (`review={row.review}`); the words moved from
  `bookingDrawer` to `myBookings` (`rated`, `ratedLabel`, `editReview`, + `editReviewLabel`), the drawer reads them
  there.
- The review form's refusal: `refused(error)` (`model/review-form.ts`, tested) tells the api's 4xx (`review_exists`,
  `review_window_passed`, `review_locked`, `review_not_allowed`, `not_found`: the booking moved on) from a failure the
  form may retry (the network, a 5xx). Refused, `ReviewModal` reads the booking, the lists and the card again
  (`keys.bookingLists()`, `keys.howWasItAll()`, the detail's key), toasts the reason and closes (move mode's and the
  drawer's pattern); failed, it stays with what was written and the reason in its Callout.
- `apps/client/steiger.config.js`: the `fsd/insignificant-slice` override stays on `features/write-review` with a
  new reason. Tried as asked: the card as `widgets/how-was-it` importing `features/write-review`: steiger then flags
  the widget (one reference, `pages/my-bookings`), and turning the rule off for the widget hides the widget's imports
  from the rule, so `features/write-review` is flagged again. No arrangement passes without a real second consumer;
  the home page's mount (slice 5) is that consumer: drop the override then.
- Fixtures: `shared/storybook/my-bookings.ts` answers `GET /me/how-was-it` (the latest completed row without a review,
  not closed, through `changed`) and `POST …/how-was-it/close` (204); `refuseReview: <code>` refuses the review and
  the row read again no longer offers one; Past gains Barber Loft's reviewed visit (`YR-48095`, 5 stars, editable).
- Stories: `Client/Pages/MyBookings` `HowWasIt` (the card, a star → the form with 5 picked → sent → the card gone, the
  row «5 · You rated» with Edit), `HowWasItClosed`, `Reviewed` (the row's rating; Edit → Save → «4 · You rated»),
  `ReviewRefused` (toast, the form closed, «Write a review» and the card gone), `Phone` (the card at 390);
  `Client/Features/WriteReview` `Refused` (now closes with the toast), `Failed` (a 500 stays with the words), `Card`,
  `CardSent`, `CardLongWords` (390 with «Text: Russian length»: the card and the page don't overflow). A whole-page
  long-words story isn't possible yet: axe flags the untouched rows' «Call» links (`label-content-name-mismatch`,
  the stretched visible text isn't in the stretched label) — a follow-up for the rows, not the card.
- Review (`code-review`, one round, 8 findings, 7 fixed): the form keeps the visit the stars were pressed for (the
  card may move on meanwhile, or go); the card's focus return has its own ref, falling back to the page title when the
  reviewed row isn't on the screen (Upcoming); `refused` matches 403/404/409 only (a 401 or 429 keeps the words);
  `YouRated` shared by the row and the drawer; `visitLine()` in `entities/booking` for the form and the card; the
  stories count the toasts. Not taken: moving the refusal's invalidation into the sdk's `bookingAction` (the brief
  asked for the drawer's and move mode's component-level pattern; a follow-up for all booking actions together).
- Not here: the home page's copy of the card (slice 5); the tabs' counts from `total` (the list carries it now; the
  tabs don't show it yet); the rows' Call label under stretched words (above); one `onError` re-read in the sdk for
  every refused booking action (above).
