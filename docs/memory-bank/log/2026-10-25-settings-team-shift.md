# Settings → Team: the staff drawer's Hours with time off (P4 slice 2, Team PR 3b-2; feat/settings-team-shift)

- Changed: the staff drawer's Hours tab (B-Team `tabHours`, design §28.4 «Staff drawer · Hours», book B-47;
  `pages/settings-team/ui/member-hours.tsx`, `model/shift.ts` tested): «Business hours» (follows them) or «Own shift»
  (a switch and the hours per weekday, a weekday the business is closed can't be switched on), a break per working day
  either way (TimeRangeField, 10-minute steps), each day's problem under it, the caption. Saved with the drawer's Save
  (`PUT …/schedule` with the days off as saved, before the profile and services); over bookings the hours' window
  asks Keep them or Cancel and offer 3 other times («… fall outside Jeren's new shift»), then the save goes on; the
  toast says «Jeren's shift saved» with what happened to them.
- Changed: «Time off»: the person's days off («9–13 November 2026», «5 days · Every year · Family trip»), removed at
  once with Undo; «Add time off» with From and To (W's DatePicker), Repeat every year and a note only the team sees
  (the api's day off has a name: the note, or «Time off»). Saved at once with the week as saved; over bookings the same
  window asks («Maral has 2 bookings during this time off»). The administrator reads the week and the time off.
- Changed: `HoursAffectedBookings` takes another change's words (title, Keep them's caption, the line under the list,
  the button); `pickDate` for stories moved to `@/shared/storybook` (the Hours and Team stories).
- Decided (Claude, delegated; chapter 9, 25.10.2026, B-47 (how)): an own shift's hours pick any time of day, as the
  business week's do (the caption says a shift doesn't open bookings while the business is closed), rather than the
  board's lists bounded by that day's business hours; the window's lead says «their own hours» or «the business
  hours» rather than a summary of the new shift.
