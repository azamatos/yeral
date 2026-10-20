---
'@yeral/api': patch
'@yeral/domain': minor
'@yeral/i18n': patch
---

A booking keeps what the client knows of it, and its one waiting news SMS is worded when it goes: a confirmation tells
the booking as it is, a change says what changed since the client knew it ("moved", "moved … with …", "now with …"),
or nothing when it's back as they knew it. No more duplicate "booked" or "now with …" texts, no "moved" for a booking
the client hadn't been told about, and a phone booking cancelled before its confirmation went texts nothing. A booking
the team enters is first told 15 seconds after it's saved, so an undo at the last moment can't leave an SMS behind.
Migration 0024 adds `bookings.told` and an index for a booking's waiting SMS.
