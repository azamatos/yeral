---
'@yeral/api': minor
'@yeral/contract': minor
'@yeral/domain': minor
---

A business may be open past midnight (book Q-105, chapter 10 P2 step 3).

- A business day keeps everything after its midnight, up to 48:00: hours like 18:00–02:00 are `open: 1080, close:
  1560`, and a 01:00 booking is the day before's, at minute 1500. `weekHoursErrors()` checks that a day's part past
  midnight ends by the next day's opening; the open state after midnight reads yesterday's hours.
- Free times count the day before's late bookings and the day after's early ones (`busyOn()`); the api loads them.
- Minutes in the contract reach 2880 (a start 2879). Migration `0007` puts `span` in absolute minutes, so the database
  refuses a specialist's or a table's overlap across midnight, and allows minutes up to 2880.
