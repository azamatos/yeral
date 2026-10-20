---
'@yeral/api': minor
'@yeral/contract': minor
'@yeral/sdk': minor
'@yeral/domain': minor
'@yeral/i18n': minor
---

The business moves and cancels bookings (book B-26, B-27): `POST /v1/w/{slug}/bookings/{code}/move` takes a confirmed
booking to a new time or another specialist's column, and a move that doesn't fit is `cannot_move` with the reason (the
service, a day off, the hours, busy elsewhere with its time, another booking, the buffer); a booking with the client's
move waiting is `move_waiting`. `POST …/cancel` cancels with a reason: "The client called to cancel" is the client's own
cancel (no undo from the app), the others show the client the reason. The client hears both by SMS (new texts for a move,
a new specialist and a cancel asked by phone, en/tk/ru), under their confirmations switch; a move's SMS defaults to
the booking's own setting, and a change within a new booking's undo time tells nothing new. The business no longer moves a waiting
request. The sdk adds `calendar.move` and `cancel`. Migration 0022 adds the cancel reason.
