# A date picker on react-day-picker, in the special days (#207, feat/ui-date-picker)

- Changed: `react-day-picker` ^10.0.2 in the catalog (owner's rule 10a: a library before our own) and `DatePicker` in
  `@yeral/ui` (`Inputs/DatePicker`): a field like an input with a calendar icon (Input's wiring, `useControlProps`, so a
  Field's error or warning shows on it) that opens the month in a Popover. The month is styled from DS-Components →
  «Pickers»: 40 round days (36 under 360 px, so a 320 phone fits), Monday first, today ringed n-900 (and
  `aria-current="date"`), the chosen day solid a-500, disabled n-500, the weekday labels 11/14 600, the month's arrows
  DateStrip's `PagerButton`. `mode="range"` picks a first and a last day with two clicks (either order; a new opening
  starts again; a range over a day that can't be picked starts again at the second click) and shows them on an a-50
  band. Dates in and out are `YYYY-MM-DD` (turned into the browser's calendar day only inside); `today`, `min`, `max`
  (the months beyond don't open) and `isDisabled`; every word comes from the app (`copy`, with its `lang`). Inside
  <Field> its label and value name the field, and the label names the month's popover; on opening, the chosen day (or
  today) takes the focus once the popover holds it, so a modal's focus trap doesn't take it back. Popovers and menus
  now sit above modals (`z-65`; modals 60, tooltips 70). Stories: one date, empty, the keyboard, disabled days with min
  and max, a range, a range chosen before, a range over a disabled day, an error, inside a modal (on top, focus in),
  today and the names, the phone.
- Changed (business): `useDatePickerWords()` and `useDateSpan()` in `shared/i18n` (the month through `fmt.monthYear`,
  the weekdays `fmt.weekdayShort` and `fmt.weekday`, a day's name `fmt.weekdayDate`, and a span: «2 November 2026»,
  «2–5 November 2026», «28 December 2026 – 3 January 2027», without the year for a yearly day; words under
  `datePicker.*`, the special days' span words moved there). Settings → Hours' special days use the picker in the
  board's fields instead of the browser's date inputs: Date, or From and To (To opens no earlier than From); a one-off
  can't pick a day before today, except the first day of one that has already started; a yearly day's field reads
  without the year; the same day picked again changes nothing. The Hours stories pick days in the month (skipping the
  neighbouring months' hidden days); «Add several days» is new.
- Decided: Claude (delegated): the board's From and To kept (rule 5a), the range mode is there for the next screens.
- Review (one round, 15 findings, all fixed but one): the popover was under the modal (z-index), the focus inside a
  modal, the stories' hidden days, a started day's first day, `lang`, the weekday labels and today's mark, the span's
  year, the same-day click, the field's warning, the arrows, the weekday weight, From and To back, the chevrons'
  remounts, the phone width, a range over a disabled day. Kept: the formatters and labels are new objects each render
  (one month; the library rebuilds its model cheaply).
- Follow-ups: `Calendar` (our own month grid in `@yeral/ui`, for the booking's day) could move onto the library; Fork U
  uses `DatePicker` (range) for a person's time off in Team's staff drawer.
