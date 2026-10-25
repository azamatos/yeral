# The booking drawer (P4 slice 3, C6; feat/client-booking-drawer)

- Changed: `/{lang}/account/bookings/{code}` (route `account/bookings.$code.tsx`, a child of My bookings: the list
  stays under it on its tab, `<Outlet />` in `MyBookingsPage`) opens a booking in `@yeral/ui`'s Drawer
  (`pages/my-bookings/ui/booking-drawer.tsx`; a bottom sheet on phones). A row's business name opens it; the whole row
  answers to the name (a stretched link, what's pressable in the row sits above it). Closing goes back to the list.
- The drawer (Account-Bookings `.drw`, book C-28–C-31): the business's photo, name (to its page) and category; the
  status with its line (waiting, «Confirmed · …», a no-show, who cancelled), «Cancelling is free.» or the free cancel
  gone by, the reason (a decline's, the business's cancel's, the client's own), the booking an offered time became
  (opening it); offered times (`ui/offer-times.tsx`, now shared with the row); a waiting move with both times and
  «Withdraw the request»; a refused move with its reason; the history (`Timeline`, `model/drawer.ts` `drawerSteps`:
  the api's events, the wait and the appointment ahead, the offered time taken); the details (`KeyValueList`: services,
  specialist, date and time, duration, price, at the place, the code); the client's note, edited while it's a request
  (`PATCH …/note`, 500 like the booking's: `NOTE_MAX` moved to `entities/booking`); the address with the map, the
  entrance note, Directions (the phone's own map app) and Call; the free cancel's end. The footer by status: Edit the
  note and Cancel (a request), Cancel (confirmed), the note to call with the number (past the free cancel), Undo (after
  the client's own cancel), Choose another time (offered times, live or passed), Book again.
- Cancel (`ui/cancel-booking.tsx`, `showCancel`): what's cancelled, the move withdrawn with it, the reason chips when
  the business asks (`askCancelReason`; the chip's words go as the client's), «Yes, cancel». Done, the drawer closes
  (as drawn) and the toast's Undo restores it (`mutateAsync`: the drawer is gone by then).
- Stories `Client/Pages/BookingDrawer` (10); the fake api has each booking (`detailOf` a row, `details` over it), the
  cancel, the move's withdrawal and the note; `model/drawer.test.ts`.
- Review (`code-review`, one round, 15 findings, all fixed): closing replaces the drawer's history entry (Back doesn't
  reopen it) and gives the focus back to the row (`rowLinkId`), the cancel modal's to the drawer's Cancel; an offered
  time taken in the drawer goes on to the booking made, and the sdk's `acceptAlternative` marks the old booking stale
  (no second read of the lists); «past the free cancel» is the api's (`actions.cancel`), not the device's clock; the
  note's editor only while the api takes a note, focused when it opens; a refused Undo said in the drawer (Undo gone,
  «Choose another time»); a refused cancel, move withdrawal or note reads the booking again; the reason chips reset
  on every opening; the row's link named «{business}, {when}: open the booking», and its «Offered time accepted» line
  opens the booking made (on Upcoming); the map, Directions and `addressLine` shared with the business page
  (`shared/ui/place-map.tsx`, `shared/lib/address.ts`; an approximate area says so), the undo words in
  `entities/booking` (`useUndoFailed`); the design's sizes (`.flab` 13/18, `.dnote` as Callout S). The stories put
  the list and the drawer in one route (`{-$code}`), so the list stays mounted as in the app.
- Not here yet: «Move to another time» (C7, `book?move=`), the review (C8, G's feature: plugged in when it lands),
  «New address» after the business moved (`movedAt`, Q-215), tables and classes (their flows come later).
