---
'@yeral/api': minor
'@yeral/contract': minor
'@yeral/sdk': minor
'@yeral/domain': minor
'@yeral/i18n': minor
---

The owner and administrators set the opening hours and special days (book B-39, B-40): `GET`/`PUT
/v1/w/{slug}/settings/hours` saves the week (30-minute steps, one break a day) and the holidays or unusual days (closed
or other hours). Bookings ahead the change leaves outside the hours make it `bookings_affected` with the list; sent again
with `keep` they stay, with `cancel` each client's booking is cancelled under the day's name (or "The opening hours
changed") with up to 3 free times they can take in one tap, by SMS too (en/tk/ru). The client's booking detail adds
`cancelOffers`. The sdk adds `settings.hours` and `updateHours`. Migration 0023 adds the two cancel reasons.
