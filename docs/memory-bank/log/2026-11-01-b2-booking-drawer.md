# The booking drawer in `widgets/booking-drawer` (P4 slice 4, PR B2; feat/b2-booking-drawer)

Slice 4's B2 (`log/2026-10-31-slice-4-plan.md` → "PRs, three lanes", decisions 3, 4 and 13): the drawer a booking
block opens (`?booking=`, book F-127, B-16 step 5, B-29), built from B-Calendar `panel=booking` and `internal`. The
first commit moved `request-drawer.tsx` and `decline-modal.tsx` from `pages/calendar/ui` to the widget (their words
to the `bookingDrawer.request` and `bookingDrawer.decline` namespaces); the calendar page imports both drawers from
`@/widgets/booking-drawer`.

## What's there

- `widgets/booking-drawer/ui/booking-drawer.tsx` — `BookingDrawer({ slug, code, now, level, placeholder?,
  onBookAgain?, onMove?, onClose })`. It reads the booking on its own (`sdk.calendar.booking`, A1's
  `GET …/bookings/{code}`), so the bookings list (B8), the client card (B11) and a notification's «Open» open it the
  same way; the calendar passes the day view's copy as `placeholder` so it shows at once. A 404 reads «This booking
  isn't in your calendar…». The body: StatusBadge + source line (Online · By phone · Walk-in, or who cancelled: the
  client, the business, «no answer in time»), «Internal status» (only when the workspace has statuses switched on,
  `sdk.settings.statuses`, and the booking is confirmed; saves at once with `calendar.setInternalStatus`, the toast's
  Undo puts the one before back), the client's alert notes, the client block, the details (KeyValueList), the client's
  note (Quote), the internal note, «Recent visits».
- `ui/client-block.tsx` — `ClientBlock`, `AlertNotes`, `RecentVisits`: the facts come from the client card
  (`sdk.clients.card(slug, id, { history: 4 })`, decision 4), not from the booking: visits, the average check (null
  without «See revenue», so an administrator's line has none), no-shows, Phone only, the notes «shown when they
  book», the last three past bookings but the one open (a specialist reads no prices, as the board). «Call» is a
  `tel:` link named by its visible word plus a hidden part (`t.rich`, the axe rule under stretched words). «Open the
  client's card →» isn't rendered yet: the route doesn't exist, and a plain `<a>` would leave the app with an unsent
  note; B11 adds a router `Link` where the comment in `ClientBlock` says.
- `model/use-note-autosave.ts` — the internal note goes whole to `calendar.setNote` 800 ms after the typing pauses, on
  blur and when the drawer closes with words unsent; a save that lands with newer words is followed by another; a
  failed one shows the error in the field and is retried with the next change. The caption says «saving…», «saved»
  or «saved automatically» (nothing typed yet, no note).
- `entities/booking/ui/internal-status-chip.tsx` — `InternalStatusChip` (18 px, icon 12 in the status's colour) and
  `useInternalStatusName` (a preset worded by the app, `internalStatuses.*`; the business's own as written).
  `BookingBlock` takes `internalStatus?` and shows the chip on the right, the name in the block's words; the day grid
  passes it for confirmed bookings from the view's `internalStatuses` (decision 13).
- Stories: `Business/Bookings/BookingDrawer` (18: each status, the statuses on and set, the autosave, the actions, the
  owner's, an administrator's and a specialist's read, a walk-in without a card, Phone only, a first visit, gone, a
  phone, the Russian length) and two on `Business/Calendar/Day` (`OpenBooking`, `InternalStatuses`).
- `apps/business/steiger.config.js`: `fsd/insignificant-slice` off for `widgets/booking-drawer` until B8 or B11 opens
  it too (then drop the override, as the client app's note says).

## For B3, B4, B5, B8

- **B3 (report, cancel):** the footer is `Footer` at the bottom of `booking-drawer.tsx`; it already computes `ahead`
  (the booking's start is still to come, business-local) and `canMove`. Add «Report ▾» (confirmed or completed, the
  round-3.1 kinds) and «Cancel booking» (danger text, wraps to its own line on the right) there; the ReportBox goes
  under the `KeyValueList` where the comment says (`b.complaint`, `by: { staffId, name }`; a specialist removes only
  her own: the drawer takes `level`, add the viewer's staff id when you need it). The toasts' Undo follow
  `InternalStatusField`'s pattern.
- **B4 (move):** pass `onMove` from the calendar page; the drawer shows «Move to another time» only for a confirmed
  booking ahead with no client's move waiting (`!b.move`). The page should close the drawer when move mode starts.
- **B5 (new booking):** pass `onBookAgain(booking)` from the pages; the button shows only with it. The booking carries
  `client.id`, the items' `serviceId`s and `staffId`s for `?panel=new`.
- **B8 (bookings list):** render `<BookingDrawer slug code now level onClose />` on `?booking=`; no placeholder
  needed. Drop the steiger override. `RequestDrawer` is the same for `?request=`.
- The calendar's `?booking=` and `?request=` keep their meaning on `/bookings` (decision 3).

## Seen, not done here

- `pages/settings-rules/model/statuses.ts` has its own `statusName`; the entity's `useInternalStatusName` could
  replace it when that page is next touched.
- Book B-16's status still says «no screen» though slice 3 built the calendar (the book's status column lags the code).
