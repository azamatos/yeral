---
'@yeral/api': patch
'@yeral/domain': minor
---

One first SMS about a booking at a time: a confirmation tells the booking as it is when it goes, so a change made before
it went no longer sends "moved" or a second "booked"; a change SMS replaces one still waiting, and none goes when the
booking is back as the client knew it. A booking the team enters is first told 15 seconds after it's saved, so an undo
at the last moment can't leave an SMS behind. Migration 0024 adds an index for a booking's waiting SMS.
