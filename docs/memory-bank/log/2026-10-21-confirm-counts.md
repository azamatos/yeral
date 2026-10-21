# 2026-10-21 · What the leave and delete confirms touch (B-15, Q-172)

- `GET /v1/w/{slug}/leave`: the person's bookings ahead and waiting requests in that workspace, the ones removing them
  would ask the owner about (`bookingsAheadWith`); the owner gets `owner_cannot_leave`.
- `GET /v1/me/deletion`: the account's bookings ahead and waiting requests, the ones `releaseAccount` cancels (one
  selection, `bookingsAheadOf`, for both), and `team`: those it's on as a specialist, which stay with each business;
  an owner gets `owns_workspace` as the deletion answers.
- One rule (`aheadAs` in `@yeral/domain/lifecycle`, unit-tested), one counter (`countAhead`: a move counted once with
  its booking) and one shape (`bookingsAhead`).
- sdk: `me.deletionCounts()` (under the person's bookings), `team.leaveCounts(slug)` (under the workspace's calendar),
  so booking changes refresh them.
- The apps' confirms (the client's profile, My profile's leave) show them with slice 2's and slice 3's screens.

Review (one round): the deletion's `team` count and its owner refusal; one selection for the count and the cancel;
`aheadAs` in the domain; leaving now refuses waiting moves onto the person (a bug from before, its test failing first);
one `leaver()` for both leave routes; counts without the bookings' items; a number of its own in the test;
techContext and API.md.
