---
'@yeral/api': patch
'@yeral/domain': minor
---

A booking and a change of hours no longer pass each other: every way a booking takes its time checks the hours as they
stand, ordered with an hours save. A waiting request on a day that closes is declined (with the day's name and offered
times), not cancelled. A booking undone while the hours are saved no longer fails the save. A specialist's cancel is
checked again under the lock. Yearly special days are checked against every weekday they may fall on. Undoing a team
booking takes back the name it gave a nameless client record (migration 0025).
