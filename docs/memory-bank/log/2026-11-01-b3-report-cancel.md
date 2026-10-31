# Report and cancel in the booking drawer (P4 slice 4, PR B3; feat/b3-report-cancel)

Slice 4's B3 (`log/2026-10-31-slice-4-plan.md` → "PRs, three lanes"): «Report ▾», the report box with «Remove
report» and «Cancel booking» in the drawer B2 built (`log/2026-11-01-b2-booking-drawer.md` → "For B3, B4, B5, B8"),
from B-Calendar `panel=report-menu | report-noshow | report-added | reported | complaint`, the cancel modal and
B-Mobile 4b; book B-27, B-28, Q-206, Q-207, Q-254; design §28 round 3.1 (one report per booking).

## What's there

- `widgets/booking-drawer/model/report-rules.ts` — `reportKinds(booking, now)`: the menu's kinds in order, each one
  `canComplain` allows (`@yeral/domain/lifecycle` already holds round 3.1: a no-show from the start until 24 h after
  the end, Came late from the start, the rest any time; with a report of another kind only No-show, which replaces it;
  nothing after a no-show). `canRemoveReport(booking, now, { level, staffId })`: `canRemoveComplaint` (7 days) and
  the role: the owner and administrators any, a specialist the ones they filed. `canCancelBooking`: `canBusinessCancel`
  (confirmed, not started). Unit tests beside it.
- `model/use-report-actions.ts` — `useReportActions(slug, now)`: `file` (`calendar.complain`) and `remove`
  (`takeBackComplaint`) with their toasts; each toast's Undo does the other quietly (a report filed is taken back; one
  removed is filed again as it was; the api puts a replaced report back itself). The booking reads back through the
  sdk's invalidation.
- `ui/report-menu.tsx` — `ReportMenu`: the ghost «Report ▾» with a Radix menu above it (two-line rows: the kind and
  what it does; No-show over an earlier report says «Replaces the earlier report…»); «Other…» opens
  `ui/report-other-form.tsx` («What happened?», 1–300 characters, Save).
- `ui/report-box.tsx` — `ReportBox` under the details: «Report», the line «Came late · Today · 11:15 · Maýsa
  Annaýewa» (an Other's words after its kind; the day by `fmt.relativeDay`, so another day reads «13 October»),
  «Remove report» (aria «Remove report: Came late») when the reader may, and the caption «The client isn't told. You
  can remove it until 21 October.» (without the right or past 7 days: «The client isn't told.»).
- `ui/cancel-booking-modal.tsx` — `CancelBookingModal`: the lead, the booking's line, the three reasons as chips
  («The client called to cancel» is the client's own cancel; «Another reason» in words the client sees, 1–300),
  «Cancel booking» danger; the toast «Booking cancelled · the client is notified» (no Undo: the api has none, the SMS
  goes at once) and the drawer closes.
- `ui/booking-drawer.tsx` — the footer: Move (B4) · Report · Cancel booking (`sm:ml-auto`, so with the three in a
  longer language it goes to its own line on the right, as the round-3 copy log says); none when nothing applies (a
  cancelled booking, a report past its window). `BookingDrawer` takes `staffId?` (the reader's own): the calendar
  page passes a specialist's column id (`view.columns[0].staffId`), since the session and the workspace list don't
  carry the member's staff id yet.
- `ui/booking-drawer.fixtures.ts` — the stories' world, moved out of `booking-drawer.stories.tsx` and shared with
  `report-and-cancel.stories.tsx`: a fixed clock (Wednesday, 14 October 2026, 11:30 business time: nothing depends on
  the day the stories run), the booking, the card, the fake api that keeps a report filed or removed and a cancel.
- Stories `Business/Bookings/ReportAndCancel` (13): before the start, started, a no-show with Undo, Other with its
  form, an earlier report (No-show replaces), reported (Remove report → Completed again, Undo), locked (past 7 days,
  no footer), a specialist's own and a colleague's report, the cancel with another reason and with «the client
  called», a phone, the Russian length. Messages: `bookingDrawer.report`, `bookingDrawer.cancel`.

## For B8, B11

- The B-Bookings row menu «Report…» can reuse `reportKinds` and `useReportActions` (export them from the widget, or
  move the three report files to `features/report-booking` when a second consumer comes).
- The client card's reports list (B11, B-34) removes a report with `takeBackComplaint` too; `canRemoveReport` is the
  rule, given the reader's staff id — the Workspace schema should carry it (`staffId` per workspace) rather than the
  calendar page's column trick.

## Seen, not done here

- The session (`me`) and the workspace list have no member staff id; B8 and B11 need it, A1-style small api PR.
- `fmt.relativeDay` reads a past day as its date («13 October»), not «Yesterday»; fine for the report line, worth a
  word when the client card's lists come.
