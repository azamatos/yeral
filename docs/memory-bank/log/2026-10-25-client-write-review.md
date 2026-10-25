# The client's review form (P4 slice 3, C8; feat/client-write-review)

- Changed: `apps/client/src/features/write-review` (book C-34, C-35; Account-Bookings `view=review`):
  - `ReviewModal` (`ui/review-modal.tsx`): the 560 modal (a bottom sheet under 768): the business (photo 48 or its
    letters) with the visit («Check-up · Dr Döwlet · Fri, 23 Oct»), «How was it?» with `RatingInput` (required;
    «Pick the stars» until picked, the word beside them), «What went well?» chips, «Your review (optional)» up to 500
    with its counter and «… will show with your first name and the first letter of your surname: Aýjemal G.», «Later»
    and «Send review». With `review` it changes the written one («Save changes» once something changed, «You can change
    your review until …», «Cancel»). Sent: `sdk.bookings.review` / `editReview` (they update the booking, the lists and
    the business's reviews), a toast («Thank you! Your review is published.» / «Your review is changed.»), closed,
    `onDone(detail)`. The api's refusal (`review_window_passed`, `review_locked`, `review_exists`) shows in the modal.
    Opened by the caller, it gives the focus back where it was (or to `returnFocus`).
  - `model/review-form.ts` (tested): `initialForm`, `toggleTag`, `tooLong`, `reviewBody`, `changed`, `editableUntil`.
  - `@yeral/domain/lifecycle`: `REVIEW_TAGS` (keys, book chapter 9 25.10.2026) and `REVIEW_TEXT_MAX`.
  - `@yeral/ui` `RatingInput` gains `placeholder` (the word before a pick).
- The slice's API for My bookings (C5) and the booking drawer (C6), lane K:
  `import { ReviewModal } from '@/features/write-review'` →
  `<ReviewModal booking={b} review={detail.review} rating={stars} open={open} onOpenChange={setOpen} onDone={…} returnFocus={ref} />`.
  `booking`: `code`, `business`, `what`, `date`, `start` (a `MyBooking` or `BookingDetail` fits); `review`: the written
  one to change (`BookingDetail.review`; leave it out for a new one: `actions.review`; pass it with
  `actions.editReview`); `rating`: the «How was it?» card's stars; `onDone(detail)`: the booking after it's sent.
- Stories: `Client/Features/WriteReview` (7: New, FromCard, Edit, TooLong, Refused, NoName, Phone) over a fake api;
  `Rating` › Input checks the placeholder.
- Not built: the tags on the business page's reviews and in the business app (they read the keys through
  `review.tag.*` when they show them); Russian-length stories (the client has English messages only).
