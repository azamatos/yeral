# Busy elsewhere (feat/p2-3-busy-elsewhere)

- Changed: P2 step 3 (book Q-272, Q-271, S-14, F-094). `loadBusy` (`availability/context.ts`) adds, for every staff
  row linked to an account, the active booking items booked with that account (`person`) on other staff rows, buffers
  included, as `BusyInterval`s with `elsewhere: true` (a second query run alongside the first, on
  `booking_items_person_date_idx`; the domain type has the flag for step 4's calendar, and its `bookingId` is the
  other workspace's, never sent out). Free times, search cards, offers and placing a booking all read it, by the same
  rule the database applies.
- The race is the database's (migration 0020): `booking_items.person` (a reference to the account, set null when it's
  deleted) is the specialist's account when the item is booked, set by the item trigger (on insert, and when the item's specialist changes), and the exclusion constraint
  `booking_items_person_no_overlap` keeps one person's active items apart like one staff row's (`family` lets a move
  overlap its own booking). Any path that writes or reactivates items — a new booking, a move, an offered time, a
  restored cancel, and step 4's business writes — gets 23P01, which `isSlotConflict` maps to 409 `slot_taken`.
- Not counted (Q-272): the person's breaks, days off, and bookings as a client. Staff without the app aren't linked.
  Linking a staff row to an account later (an invite accepted) leaves its earlier items without a person, so an old
  overlap doesn't stop the link; a row losing its account leaves its items with the person they were booked with.
  Items from before the migration get no person, so it can't fail on old overlaps (production has no bookings).
- Not covered: class sessions a person teaches (classes come after the MVP).
- First tried as an app-level lock and check in each write path; the review preferred the constraint, which no path
  can forget.
- Follow-ups: step 4's calendar shows `elsewhere` intervals as the plain reserved block with no details (never the
  other workspace's booking id, client or service).
