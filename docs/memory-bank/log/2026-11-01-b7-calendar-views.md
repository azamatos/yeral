# The calendar's views and legend (P4 slice 4, PR B7; feat/b7-calendar-views)

Slice 4's B7 (`log/2026-10-31-slice-4-plan.md` → "PRs, three lanes", decisions 1 and 2): book B-17, F-134, board B-Calendar
`view=dayOne | weekAll | weekOne`, `legend`, `role=specialist`.

## What's there

- `pages/calendar/model/grid.ts`: `mondayOf`, `weekCell` (booked minutes over working minutes, breaks left out, capped at
  100; requests apart; a day off named).
- `ui/week-all.tsx` (the load matrix on `Meter`), `ui/week-one.tsx` (seven columns of textless blocks at 48 px an hour),
  `ui/calendar-legend.tsx` (on `StatusLegend`, first-visit open in `localStorage`, wrapped in try/catch).
- `day-grid.tsx`: `only` filters to one person; `BookingBlock.wide` adds the phone, length, price and the note.
- `calendar-page.tsx`: the toolbar's two Segmented and the person's Select, ‹ › by seven days in a week, the date button
  reading the week's range, the week's line.

## Traps

- axe's `label-content-name-mismatch` only runs on what a story ends on. A story that clicks through a screen never
  checks it: `WeekLoad` passed with a broken name until `WeekLoadAddress` stopped on the matrix. A button with visible
  words keeps them as its name, and adds context in `sr-only`, not in `aria-label`.
- The legend's popover ran off the bottom at 1280×720 on a first visit, «Got it» out of reach, and only «Got it»
  remembers the visit. Its height is now capped by Radix's available height too. No story reproduces it (the stories'
  viewport keeps it on screen): `e2e/tests/owner.setup.ts` at 1280×720 is the test, it clicks «Got it».
- The stories' `beforeEach` marks the legend as seen: on a phone viewport it opens as a modal sheet and blocks the page.

## Seen, not done here

- The week's line has no revenue: the design's week doesn't draw it.
- Week views don't show cancelled bookings even with «Show cancelled»; the board filters them only on the day.
