---
'@yeral/api': minor
'@yeral/contract': minor
'@yeral/domain': minor
'@yeral/i18n': minor
---

A client may have at most 3 requests waiting at one business and 10 in all (book Q-124); past that, sending answers 409
`too_many_waiting` with the limit it would pass. Move requests and instant bookings don't count.
