---
'@yeral/api': minor
'@yeral/contract': minor
'@yeral/domain': minor
---

The owner sets each specialist's schedule (book B-47): `GET`/`PUT /v1/w/{slug}/team/{staffId}/schedule` with their
shift (or the business hours), one break per weekday and personal days off; administrators read it. Bookings ahead it
leaves outside their day are asked about first (409 `bookings_affected`), then moved to a free colleague who does the
services (else cancelled with 3 other times) or kept. Removing someone (B-50) now asks about their bookings ahead the
same way and moves them to a named colleague, keeps them, or cancels them with 3 other times; it answers 200 with what
happened. A booking being made checks its specialist's day as it stands.
