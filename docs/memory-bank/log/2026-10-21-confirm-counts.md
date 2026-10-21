# 2026-10-21 · What the leave and delete confirms touch (B-15, Q-172)

- `GET /v1/w/{slug}/leave`: the person's bookings ahead and waiting requests in that workspace, the ones removing them
  would ask the owner about (`bookingsAheadWith`); the owner gets `owner_cannot_leave`.
- `GET /v1/me/deletion`: the account's bookings ahead and waiting requests, the ones `releaseAccount` cancels.
- One shape (`bookingsAhead` in `@yeral/contract/common`) and one counter (`countAhead` in `bookings/repo.ts`): a move
  request isn't counted beside its booking; a request past its hold or a visit that started isn't ahead.
- sdk: `me.deletionCounts()` (under the person's bookings), `team.leaveCounts(slug)` (under the workspace's calendar),
  so booking changes refresh them.
- The apps' confirms (the client's profile, My profile's leave) show them with slice 2's and slice 3's screens.
