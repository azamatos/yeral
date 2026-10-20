---
'@yeral/api': minor
'@yeral/contract': minor
'@yeral/domain': minor
'@yeral/i18n': minor
---

Time limits (book Q-254, Q-206, Q-126): a no-show can be marked from the visit's start until 24 hours after its end,
other complaints any time on a confirmed or completed booking (`canComplain`); a review can be written until 30 days
after the visit (`review_window_passed`). New error codes `noshow_window_passed` and `review_window_passed`.
