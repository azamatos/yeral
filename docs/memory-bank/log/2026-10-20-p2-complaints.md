# Complaints and no-shows (feat/p2-complaints)

- Changed: P2 step 4, book B-28, Q-206, Q-207, Q-254 (chapter 9 how-row, 20.10.2026, Claude (delegated)).
  - `POST /v1/w/{slug}/bookings/{code}/complaint` (`calendar/complaints.ts`, `fileComplaint`): the booking locked;
    404 for one the reader can't see, 403 for one they may not mark (`noshow`, a specialist all-theirs only);
    `canComplain` decides; "Gelmedi" goes through `setStatus` (no-show, `booking.noshow` event), the others stay with
    the team (`booking.updated`, no user).
  - `DELETE` the same path (`removeComplaint`): `canRemoveComplaint` (7 days, `complaint_locked`); a no-show goes
    back by `statusWithoutNoShow` (confirmed while the visit runs, `completedAt` cleared; else completed), the client's
    screens refresh with no message.
  - Domain: `canRemoveComplaint`, `COMPLAINT_UNDO_DAYS`, `statusWithoutNoShow`; contract `complaintInputSchema`
    ("other" needs its text), the calendar booking's `complaint`; error `complaint_locked` (tk, ru, en).
  - Migration 0029: `bookings.complaint_by` (who filed it, for the client card's reports).
  - sdk: `calendar.complain`, `calendar.takeBackComplaint`.
- Tests: `calendar/complaints.test.ts` (before the start only rude or other; a no-show from the start in place of
  the earlier one, seen by the client and on the calendar; the 24-hour window; taken back during and after the visit;
  locked after 7 days; a specialist's own, another's 404; two no-shows make the client phone-only, one taken back
  lifts it); `lifecycle.test.ts`.
- Follow-ups: the client card's reports list reads `complaint_by` (next PR); classes' no-shows wait for classes.
