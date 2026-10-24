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
- Follow-ups: a delete over bookings (a day of other hours whose removal leaves bookings outside the week) only shows
  the error; the date fields are the browser's own date inputs (no date picker in `@yeral/ui` yet).
