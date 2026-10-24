# Special days in Settings → Hours (P4 slice 2; feat/settings-special-days)

- **The list** (`features/edit-hours/ui/special-days.tsx`, B-Settings «Special days», design §8 «Aýratyn günler»,
  §28.5, book B-40): a row per day with its dates («2 November 2026», yearly «1 January», «21–22 March»), «Every year»
  or «One-off», «Closed» or its hours, and a menu with Edit and Delete; «Add a special day»; the empty line. Under the
  week on `pages/settings-hours`.
- **Each change saves on its own** (no save bar): the modal, a delete (a toast with Undo, which saves the list back).
  They send the saved week, never the week being edited above them.
- **The modal** («Add a special day» / «Edit special day»): the name clients see if a booking is cancelled for it (40),
  One day or Several days, the date(s), «Repeat every year (holiday)», Closed or Different hours. Checked before the api
  does (`model/special-days.ts`): a one-off day in the past, the end before the start, a year at most; other hours at
  the same time, past midnight into the next day's opening («Closes after Saturday opens. Pick an earlier time.»), the
  night before into this day, and a yearly day against every weekday (`nightOverlaps`, `yearlyNightOverlaps`, as
  `checkChange`). An overlap names the other day and which one applies there (a dated day beats a yearly one, a shorter
  range a longer, Closed beats Different hours; a tie keeps the existing one), as `findException` decides.
- **Bookings on those days** (409 `bookings_affected`): the modal says how many and whose («3 bookings and 1 request on
  this day — Maral 4»; «… fall outside these hours» for other hours), Keep them with the kind's caption (Closed: «No new
  online bookings on that day / those days.»; Different hours: «New bookings follow the new hours.») or Cancel and offer
  3 other times; the next Save sends the choice; the toast counts what the api cancelled.
- **A delete over bookings** (a day of other hours whose removal leaves bookings outside the week) opens the hours'
  Keep them / Cancel step («Without “Party”, the week’s hours apply.»), then deletes with the choice.
- Review (one round): Undo saves the list as it is now (read again) with the day back in its place, so a change since
  and a day the api dropped meanwhile stay; a day is known by its fields, not its index; nothing else saves while one
  save runs; a new day goes last (in a full tie the existing one applies, as `findException` and the warning say);
  10:00–10:00 (a whole day from 10:00) is «the same time»; a yearly day says whether to close earlier or open later; a
  dated year-long range overlaps every yearly day; the cancel toast counts bookings and requests as the week's does;
  the stories don't depend on the weekday or the year.
- Follow-ups: one precedence helper in `@yeral/domain/hours` (`specialDayWinner`, COMPONENTS.md
  `entities/business/model/special-day-precedence`) shared with the api, instead of the model's copy of the ranking;
  `Pill` in `@yeral/ui` and SpecialDayRow in `entities/business` (COMPONENTS.md) for the row's hand-drawn tags; the
  date fields are the browser's own date inputs (no date picker in `@yeral/ui` yet).
