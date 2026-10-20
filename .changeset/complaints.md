---
'@yeral/api': minor
'@yeral/contract': minor
'@yeral/domain': minor
'@yeral/i18n': minor
'@yeral/sdk': minor
---

"Arz et" (book B-28): the team files one complaint per appointment booking (no-show from the visit's start until a
day after it, late from the start, rude or other any time); a no-show changes the booking's status, which the client
sees, and counts toward the phone-only limit. A mistaken one is taken back within 7 days, the booking as it was,
the complaint a no-show replaced included. The calendar's booking shows it. Migration 0029 adds
`bookings.complaint_by` and `complaint_before`.
