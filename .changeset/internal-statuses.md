---
'@yeral/api': minor
'@yeral/contract': minor
'@yeral/domain': minor
'@yeral/i18n': minor
'@yeral/sdk': minor
---

Internal statuses (book B-29): team-only markers such as "Arrived" and "Started" for confirmed bookings, which never
change the booking's status and never reach the client. `…/settings/statuses` lists the two presets (off at first)
and up to three of the business's own, with a name, one of 8 icons and one of 6 colours; `PUT
…/bookings/{code}/internal-status` puts one on a booking. Migration 0028 adds `internal_statuses` and
`bookings.internal_status_id`.
