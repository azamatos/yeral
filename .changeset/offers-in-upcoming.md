---
'@yeral/api': patch
---

My bookings: a declined or expired request with an offered time that can still be taken stays on top of Upcoming,
soonest offer first, instead of going straight to Past; it moves to Past once its times are past or taken (book C-25,
C-26, C-40). A request that just ran out no longer shows in Past for a minute before its times arrive.
