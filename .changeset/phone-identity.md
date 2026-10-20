---
'@yeral/api': minor
'@yeral/contract': minor
'@yeral/sdk': minor
---

A phone number that passes to someone else (book Q-270): signing in links a phone's bookings only if upcoming or from
the last 6 months, and business records only if made in that time or holding a booking from it. An account unused for
6 months that holds bookings, team rows or client records answers `POST /v1/auth/verify` (and the link page's verify)
with 202 `{ isThisYou: { name, ticket } }` before anyone signs in (`name` is null when it has none); one holding
nothing of a person's starts afresh. `POST /v1/auth/identity` takes the answer: yes signs in, no lets the old account
go, leaving what was sent to the number lately to its new holder, and starts a fresh one. The sdk's
`auth.answerIdentity` sends the answer.

A changed phone keeps the person's business records (book Q-171): they move to the new number, merged with a recent
record a business already kept for it; the bookings ahead and the person's active team rows take the new number;
invites to the old number are cancelled.
