# Instant updates and fewer repeated reads (perf/instant-updates)

- Asked: the owner found the business app's updates not instant (25.10.2026); the server answers in 8 ms (p50), and in
  23 minutes of the owner's use Caddy logged `GET /v1/me/workspaces` 42 times, `/v1/me/setup` 35, `/v1/me` 17.
- Why the reads: every query refetched on window focus after 15 s (the owner switching tabs) on top of the events
  feed's own focus poll; every settings save refreshed the switcher and the draft, and then its own event did again;
  opening a workspace read the switcher again for its `current`; the wizard's steps refreshed the draft three times
  (the save, the step, the event).
- Changed (`@yeral/sdk`, #202): `instant(queryKey, change)` (ADR 0011's `onMutate` + rollback): `updateService` (the
  online switch), `renameGroup`, `orderPhotos` (cover and order), `removePhoto` change the cache before the request; a
  refusal puts the old data back and invalidates the key (not waited for: the toast comes at once); the screens toast
  why. The services row shows the switch's value on its way while it saves, and a group the name on its way, so a menu
  refresh meanwhile can't flick them back; the rename's mutation moved to the group (the box closes at once, the toast
  still comes; one rename at a time). The photos section lost its own cache code. `team.workspaces` and `setup.mine`
  stay fresh 5 minutes (`LONG_STALE`; only the business app reads them); booking events now refresh the switcher (its
  request counts); `me` keeps a minute (the client site runs no feed). The events feed takes its starting cursor even
  in a hidden tab, so a tab opened in the background hears what changed before it was first looked at.
  `settingsChanged` no longer refreshes the switcher and the draft; `profileChanged` (profile, logo, send for review,
  booking rules) does, so the wizard's business step no longer reads the draft twice. `team.open` sets `current` in the
  cached list instead of reading it again (refused: read again). Unit tests for each instant change and its rollback, a
  moved service, the hidden tab, `open`, the settings split and the stale times; all 517 stories pass.
- Review (one round, 15 findings): dropped turning TanStack's focus refetch off while the feed runs (a background tab
  and answers that change with time, like free times, had nothing to refresh them), `me` back to a minute, the switch
  and the group name shown from the change on its way, the rollback's refetch not waited for, a moved service not
  written into its old group, `open` read again when refused, one rename at a time, the wizard's double draft read, a
  `withGroupName` helper, the rename box's dead props.
- Not changed: the person's own change still comes back as an event and refreshes its keys a second time (events
  don't name who made them; with the push channel in slice 3, an event could carry its session and be skipped); a
  rollback restores the whole list held before the change and reads it again, so another change still on its way may
  flick once; a refused rename closes its box (the toast says why, the name is typed again); a feed with more than one
  page of events after a long absence catches up over the next ticks; the internal statuses' switches ride the booking
  rules' save bar on purpose.
- Follow-ups: the favourite heart on the client site (ADR 0011's example) could use `instant` too; deleting an internal
  status could, once its row's toast lives in the list.
