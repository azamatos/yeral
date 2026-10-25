# The client's review form (P4 slice 3, C8; feat/client-write-review)

- Changed: `apps/client/src/features/write-review` (book C-34, C-35; Account-Bookings `view=review`):
  - `ReviewModal` (`ui/review-modal.tsx`): the 560 modal (a bottom sheet under 768): the business (photo 48 or its
    letters) with the visit («Check-up · Dr Döwlet · Fri, 23 Oct», `whatParts()` in `entities/booking`), «How was
    it?» with `RatingInput` (required; «Pick the stars» until picked, the word beside them), «What went well?» chips,
    «Your review (optional)» cut at 500 with its counter and, for a new one, «… will show with your first name and the
    first letter of your surname: Aýjemal G.», «Later» and «Send review». With `review` it changes the written one
    («Save changes» once something changed, «You can change your review until Fri, 30 Oct, 14:32.», «Cancel»). What
    it opened on stays for that opening (a review settling into the cache doesn't turn it into an edit). Sent:
    `sdk.bookings.review` / `editReview` (they update the booking, the lists and the business's reviews), a toast
    («Thank you! Your review is published.» / «Your review is changed.»), closed, `onDone(detail)`; it can't be
    closed while sending, and the send finishes even so. The api's refusal (`review_window_passed`, `review_locked`,
    `review_exists`) shows in the modal. Opened by the caller, it gives the focus back where it was (or to
    `returnFocus`).
  - `model/review-form.ts` (tested): `initialForm`, `toggleTag` (6 at most, a written review's other tags counted),
    `tooLong`, `reviewBody`, `changed`.
  - `@yeral/domain/lifecycle`: `REVIEW_TAGS` (keys, book chapter 9 25.10.2026), `REVIEW_TAGS_MAX`,
    `REVIEW_TAG_LENGTH_MAX`, `REVIEW_TEXT_MAX` (the contract's `reviewInputSchema` uses them) and
    `reviewEditableUntil()` (the client's actions, the api's `review_locked` and the form's line share it).
  - `@yeral/ui` `RatingInput` gains `placeholder` (the word before a pick, describing the group) and `required`.
  - `apps/client/steiger.config.js`: `fsd/insignificant-slice` is off for `features/write-review` until My bookings
    and the booking drawer import it; drop the override then.
- The slice's API for My bookings (C5) and the booking drawer (C6), lane K:
  `import { ReviewModal } from '@/features/write-review'` →
  `<ReviewModal booking={b} review={detail.review} rating={stars} open={open} onOpenChange={setOpen} onDone={…} returnFocus={ref} />`.
  `booking`: `code`, `business`, `what`, `date`, `start` (a `MyBooking` or `BookingDetail` fits); `review`: the written
  one to change (`BookingDetail.review`; open «Edit» once the detail is there, with `actions.editReview`; leave it out
  for a new one, `actions.review`); `rating`: the «How was it?» card's stars; `onDone(detail)`: the booking after it's
  sent; `returnFocus`: when the opener is gone by the close (the card's stars).
- Stories: `Client/Features/WriteReview` (7: New, FromCard, Edit, Limit, Refused, NoName, Phone) over a fake api;
  `Rating` › Input checks the placeholder and the description.
- Review (one round, 15 findings, 13 fixed): the above. Not taken: the counter on the label's row as the board draws
  it (the DS Field puts it under the control); one shared way for modals without a trigger to give the focus back
  (the modal does its own, as the others do).
- Not built: the tags on the business page's reviews and in the business app (they read the keys through
  `review.tag.*` when they show them); Russian-length stories (the client has English messages only).
