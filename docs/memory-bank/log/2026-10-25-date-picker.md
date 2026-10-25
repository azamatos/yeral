# A date picker on react-day-picker, in the special days (feat/ui-date-picker)

- Changed: `react-day-picker` ^10.0.2 in the catalog (owner's rule 10a: a library before our own) and `DatePicker` in
  `@yeral/ui` (`Inputs/DatePicker`): a field like an input with a calendar icon that opens the month in a Popover; the
  month styled from DS-Components → «Pickers» (40 round days, Monday first, today ringed n-900, the chosen day solid
  a-500, disabled n-500, the month and its two arrows over the days); `mode="range"` picks a first and a last day with
  two clicks (in either order; a new opening starts again) and shows them on an a-50 band. Dates in and out are
  `YYYY-MM-DD` (turned into the browser's calendar day only inside); `today`, `min`, `max` (the months beyond don't
  open) and `isDisabled`; every word comes from the app (`copy`). Inside <Field> its label and value name the field,
  and the month's popover is named by the label. Keyboard as the library gives it. Stories: one date, empty, the
  keyboard, disabled days with min and max, a range, a range chosen before, an error, the phone.
- Changed (business): `useDatePickerWords()` in `shared/i18n` (the month through `fmt.monthYear`, the weekdays
  `fmt.weekdayShort`, a day's name `fmt.weekdayDate`, «2 November 2026», «2 – 5 November 2026»; words under
  `datePicker.*`). Settings → Hours' special days use it instead of the browser's date inputs: one day, or «Several
  days» as one «Dates» field with the range (it was From and To); a one-off can't pick a day before today; a yearly
  day's field reads without the year. The Hours stories pick days in the month; «Add several days» is new.
- Decided: the range in one field rather than the board's From and To (one month, two clicks; the end can't come
  before the start any more), Claude (delegated); the board draws the browser's date inputs, which the owner replaced
  with this library (rule 10a, 25.10.2026).
- Follow-ups: `Calendar` (our own month grid in `@yeral/ui`, for the booking's day) could move onto the library too;
  Fork U uses `DatePicker` for a person's time off in Team's staff drawer.
