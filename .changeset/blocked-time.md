---
'@yeral/api': minor
'@yeral/contract': minor
'@yeral/domain': minor
'@yeral/sdk': minor
---

Blocked time (book B-18): `POST /v1/w/{slug}/calendar/blocks` closes part of a day for one person ("Ýapyk · Okuw"),
optionally every week up to a date; `GET` lists them and `DELETE …/blocks/{id}` takes one (or the rest of its series)
away. Nobody books blocked time: free times leave it out, a move onto it is `cannot_move` with `blocked`, and a block
over a booking is refused (`block_over_bookings`). The owner and administrators block anyone's time, a specialist only
their own. Migration 0027 adds `staff_blocks`.
