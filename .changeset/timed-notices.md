---
'@yeral/api': minor
'@yeral/contract': minor
'@yeral/domain': minor
---

The timed notices (book S-01, S-13): each request says when "Haýyşyň wagty gutarýar" is due (`warnAt`, 5 minutes
of open time before its answer time ends), and when an invite's 7 days run out the team's and the invitee's screens
refresh once. Migration 0033 adds `invites.expiry_told_at`.
