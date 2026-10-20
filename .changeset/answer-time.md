---
'@yeral/api': minor
'@yeral/contract': minor
'@yeral/domain': minor
---

The typical answer time is worked out (book Q-113): the business page's `typicalConfirmMinutes` is the median of the
last 30 days' answer times, rounded up (15 min, 1 h …), and null until the business has answered 5 requests. Bookings
keep when the business answered them (`answered_at`).
