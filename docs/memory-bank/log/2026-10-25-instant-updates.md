# Instant updates and fewer repeated reads (perf/instant-updates)

- Asked: the owner found the business app's updates not instant (25.10.2026); the server answers in 8 ms (p50), and in
  23 minutes of the owner's use Caddy logged `GET /v1/me/workspaces` 42 times, `/v1/me/setup` 35, `/v1/me` 17.
- Why the reads: every query refetched on window focus after 15 s (the owner switching tabs) on top of the events
  feed's own focus poll; every settings save refreshed the switcher and the draft, and then its own event did again;
  opening a workspace read the switcher again for its `current`; the wizard's steps refreshed the draft three times
  (the save, the step, the event).
- Changed (`@yeral/sdk`): `instant(queryKey, change)` (ADR 0011's `onMutate` + rollback): `updateService` (the online
  switch), `renameGroup`, `orderPhotos` (cover and order), `removePhoto` change the cache before the request; a refusal
  puts the old data back and invalidates the key; the screens toast why (the services row and the photos section lost
  their own cache code; the group rename's mutation moved to the group, so the box closes at once and the toast still
  comes). `me`, `team.workspaces` and `setup.mine` stay fresh 5 minutes (`LONG_STALE`); booking events now refresh the
  switcher (its request counts) since nothing else would within those minutes. `startEvents` turns TanStack's
  `refetchOnWindowFocus` off while it runs (the client site keeps it). `settingsChanged` no longer refreshes the
  switcher and the draft; `profileChanged` (profile, logo, send for review, booking rules) does. `team.open` sets
  `current` in the cached list instead of reading it again. Unit tests for each instant change and its rollback, the
  focus default, `open`, the settings split and the stale times; all 517 stories pass.
- Not changed: the person's own change still comes back as an event and refreshes its keys a second time (events
  don't name who made them; with the push channel in slice 3, an event could carry its session and be skipped); the
  internal statuses' switches ride the booking rules' save bar, so they aren't instant on purpose.
- Follow-ups: the favourite heart on the client site (ADR 0011's example) could use `instant` too; deleting an internal
  status could, once its row's toast lives in the list.
