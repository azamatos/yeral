# Time limits on no-shows, complaints and reviews (feat/p2-3-time-limits)

- Changed: P2 step 3 (book Q-254, Q-206, Q-126), in `@yeral/domain/lifecycle`. `canComplain(b, type, now)`: "Gelmedi"
  from the visit's start until 24 hours after its end (`NOSHOW_MARK_HOURS`, `noshow_window_passed`); late, rude and
  other complaints any time on a confirmed or completed booking. A review can be written until 30 days after the
  visit's end (`REVIEW_WRITE_DAYS`, `reviewOpen`): `clientActions.review` turns off, and `POST .../review` answers 409
  `review_window_passed`. New error codes with en, tk and ru messages.
- The business's "Arz et" endpoint comes with P2 step 4 and uses `canComplain`.
- Also: 05 limits lost stale **Code differs** lines on moves (fixed in #47, #48).
