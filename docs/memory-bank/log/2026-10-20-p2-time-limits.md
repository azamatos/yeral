# Time limits on no-shows, complaints and reviews (feat/p2-3-time-limits)

- Changed: P2 step 3 (book Q-254, Q-206, Q-126), in `@yeral/domain/lifecycle`. `canComplain(b, type, now)`: "Gelmedi"
  from the visit's start until 24 hours after its end (`NOSHOW_MARK_HOURS`, `noshow_window_passed`), taking the place of
  an earlier complaint of another type; late from the start; rude and other any time on a confirmed or completed
  booking (revised from Q-206's "late any time", chapter 9). `BookingState.complaintType` replaces `hasComplaint`.
  `canWriteReview`: a completed visit until 30 days after its end (`REVIEW_WRITE_DAYS`); `clientActions.review` and
  `POST .../review` share it (409 `review_window_passed`; an existing review answers `review_exists` first). New error
  codes with en, tk and ru messages; ADR 0017 revised.
- The business's "Arz et" endpoint comes with P2 step 4 and uses `canComplain`; a no-show replacing another complaint
  overwrites `complaint_type` (one column).
- Known: the messages say "24 hours" and "30 days" in their text; a change to the limits changes them too.
- Also: 05 limits lost stale **Code differs** lines on moves (fixed in #47, #48).
