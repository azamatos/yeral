---
'@yeral/api': patch
---

Safer, truer demo data: seeding refuses to run without an explicit environment (so a server never gets its data wiped by default) and leaves the database untouched if it fails; the demo looks as designed on every weekday (opening hours, team shifts, yoga classes and their taken seats); demo table bookings use the restaurant's sitting time; demo photos also show when the api runs from its build.
