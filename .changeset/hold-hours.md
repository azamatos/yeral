---
'@yeral/api': minor
'@yeral/domain': minor
---

A request's hold time counts only while the business is open (book Q-120): `holdUntil()` takes the business's hours,
uses up the hold inside its open stretches (special days included, breaks not, a night past midnight too) and never
runs past the visit start. A request sent at 23:00 to a business opening at 09:00 with a 30-minute hold waits until
09:30.
