---
'@yeral/api': minor
'@yeral/contract': minor
'@yeral/sdk': minor
'@yeral/domain': minor
'@yeral/i18n': minor
---

The team books clients who call or walk in (book B-23–B-25): `GET /v1/w/{slug}/free-times` gives the nearest four free
times with their specialist, a day's starts with who is free at each and the 14-day strip, never before the current
step; `POST /v1/w/{slug}/bookings` saves a booking confirmed at once, finding the client by the phone or adding them;
`POST …/bookings/{code}/undo` takes it back within 10 seconds (`undo_expired` after). A phone booking texts the client
the date, time and address once the undo is over (en/tk/ru); a walk-in sends nothing unless asked. A specialist books
only themself. SMS no longer go to landlines. The sdk adds `calendar.freeTimes`, `add` and `undo`.
