---
'@yeral/api': minor
'@yeral/contract': minor
'@yeral/domain': minor
'@yeral/sdk': minor
---

The timed notices (book S-01, S-13): 5 minutes before a request's answer time ends the team's open screens hear
`request.expiring` once ("Haýyşyň wagty gutarýar"), and when an invite's 7 days run out the team's and the invitee's
screens refresh. Migration 0033 adds `bookings.expiry_warned_at` and `invites.expiry_told_at`.
