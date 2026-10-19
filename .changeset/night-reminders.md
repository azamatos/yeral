---
'@yeral/api': minor
'@yeral/domain': minor
---

Client reminders keep out of the night (book Q-285): `reminderPlan()` plans the day and 2-hour reminders, moves one
that would arrive between 22:00 and 08:00 to 21:30 the evening before the visit (worded "tomorrow"), sends at most one
reminder on any day before the visit, and leaves out a moved one within 2 hours of booking. A 07:00 visit gets one
reminder at 21:30 the evening before, not one at 05:00. A moved reminder goes only if the client wants a reminder it
stands for (its `covers`).
