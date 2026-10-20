# Busy elsewhere (feat/p2-3-busy-elsewhere)

- Changed: P2 step 3 (book Q-272, Q-271, S-14, F-094). `loadBusy` (`availability/context.ts`) adds, for every staff
  row linked to an account, that account's active booking items as a specialist in its other workspaces, buffers
  included, as `BusyInterval`s with `elsewhere: true` (one joined query; the domain type has the flag for the
  calendar). Free times, search cards, offers and placing a booking all read it.
- The race: the exclusion constraint keeps one staff row's items apart, not one person's. `assertFreeElsewhere(tx,
  bookingId)` (`bookings/repo.ts`) runs where items become active — `insertBooking` (new, move, offered time) and
  `restoreBooking` — taking a transaction advisory lock per person (sorted ids) and checking the person's active items
  elsewhere with `span &&`; a clash throws `BusyElsewhere`, which `isSlotConflict` maps to 409 `slot_taken`.
- Not counted (Q-272): the person's breaks, days off, and bookings as a client. Staff without the app aren't linked.
- Follow-ups: step 4's calendar shows `elsewhere` intervals as the grey block with no details (never the other
  workspace's booking id, client or service); every business write that activates items (a staff booking, an undo of
  a decline, accepting a move) calls `assertFreeElsewhere` in its transaction. Linking a staff row to an account
  (an invite accepted) doesn't check old overlaps: the business sees both and sorts it out.
