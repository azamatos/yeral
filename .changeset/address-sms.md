---
'@yeral/api': minor
'@yeral/contract': minor
'@yeral/domain': minor
'@yeral/i18n': minor
---

A business that moves tells its clients (book Q-215): when the owner or an administrator changes the address line,
street or city, every waiting request and confirmed visit ahead gets an SMS with the new address, 10 minutes after the
last change (a quick fix makes one SMS, a move and back none; a visit sooner hears it 30 minutes before, or at once).
It goes whatever the client's SMS switches; a reminder that goes first says "new address" instead. The business page
adds `movedAt` ("New address" for 30 days; a move back clears it), and a booking ahead adds it once its SMS went.
Migration 0026 adds `bookings.address_told`, `businesses.moved_at` and `moved_from`.
