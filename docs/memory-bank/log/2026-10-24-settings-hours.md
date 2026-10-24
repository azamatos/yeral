# Settings → Hours (P4 slice 2; feat/settings-hours)

- **The hours editor is a feature** (`features/edit-hours`): the week's model (`model/hours.ts`, moved from
  `pages/setup`, plus `changedDays`), `WeekHoursRows` (a row per day: switch, hours, one break, the day's problem) and
  `SameHoursSwitch` (the wizard's «Same hours Monday to Friday»; Settings doesn't draw it). The wizard's hours step uses
  them with the same behaviour; their words moved from `setup.hours` to `hours`. `useDayName` is in `shared/i18n`.
- **Settings → Hours** (`pages/settings-hours`, B-Settings `pane=hours`): «Opening hours» with the week and the
  past-midnight note; the save bar while the week differs from the saved one (Save disabled while a day has a
  problem); «Hours saved» after. The special days are sent back as they are (their section is next).
- **Bookings outside the new hours** (book Q-211; the api's 409 `bookings_affected`, #175): `HoursAffectedBookings`
  (a 560 modal) titles the count («3 bookings and 1 request fall outside the new hours»), names the changed days
  («Sunday closed. These were booked before the change.»), Keep them / Cancel and offer 3 other times, the
  `AffectedBookingsList` («Today · 18:00–18:45» over «client · service · specialist»; Confirmed, or Pending with the
  time left to answer), «New bookings follow the new hours either way.»; Save sends the choice and the toast says what
  happened. Words in `affected.*` (shared by the hours and, later, Team).
- **Placement:** COMPONENTS.md puts the list in `entities/booking/ui/affected-bookings-list`; with one consumer the FSD
  lint (steiger `insignificant-slice`) refuses that slice, so the list sits in `features/edit-hours` and moves to
  `entities/booking` with Team's shift and remove flows.
- Follow-ups: the special days section (list, add/edit modal that saves directly, overlap warning); «Fri, 16 Oct»
  needs a three-letter weekday in `fmt` (the list shows «Fr, 16 Oct»); the save bar's words live in `settings.hours.save`
  until a second section shares them; a week with every day closed disables Save without saying why.
