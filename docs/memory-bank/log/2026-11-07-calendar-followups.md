# 2026-11-07 · Calendar follow-ups (design v0.7 · B2, B3)

Branch `feat/calendar-followups`, after #317 (`log/2026-11-07-calendar.md`). Board `docs/design/screens/business/B7-Calendar.dc.html`.

## What's there

- **Week blocks never cut a time** (`entities/booking/model/block-fit.ts`, `WeekBlock`): the block reads its own box
  (`ResizeObserver`, before paint) and `blockFit` picks what fits — the time left at the top right, else on its own line
  under the service (a long block ≥ 62 px high, a 30-min one ≥ 30), else dropped; then the markers drop; then the range
  becomes the start; 30/15 min give up the name, then the time; the narrowest show the name only. Widths are measured
  Geist 12 px figures (range 76, start 36, TimerPill S 64). Every visible part is `aria-hidden`; the block's name is
  always the whole booking: «13:00–15:00 Arzygül Hojaýewa Facial cleansing, Pending, 19 min left to answer». The
  hover card is unchanged (it always had everything).
- **Filters' statuses** (`calendar-toolbar.tsx`): a «Status» group with a checkbox, the status icon and the count of
  bookings on screen (the day's, or the week's, of the people shown) per Pending / Confirmed / Completed / No-show;
  nothing ticked = every status. `?status=pending,noshow` (`statusesOf` in `model/search.ts`, known ones in the board's
  order). The grids get the view with the others filtered out (cancelled ones still go by Show cancelled). «Filters · n»
  counts the statuses and Show cancelled; the footer «n on · Clear» shows only when something differs from the default.
  Show cancelled carries the cancelled count while it's on (the api doesn't load them otherwise).
- **390 «Whose calendar» sheet**: the person's avatar next to DateNav opens `SelectLayer` + `OptionList` (`@yeral/ui/select`,
  a sheet under 768): «Takes bookings» header, search, a row each with the day's (week's) count, one pick, no Everyone. The
  chip row is gone.
- **390 week as a list** (`week-list.tsx`): on a phone (`max-width: 639px`) any week shows the phone's person as a list of
  days — sticky head (date, Today, count, amber requests), start over end, a card in the status tint with the icon, client,
  «service · length», the time left and the phone icon; break, closed and busy elsewhere as grey rows, a day off one row;
  the now line between rows; it opens scrolled to today; a card opens the booking.
- **DateNav keys**: ← → move a day (a week in Week), T today; not while typing or inside a list, dialog, menu, radio group
  or tabs. The arrows' and Today's tooltips say so («Next day · →», «Today · T»), `aria-keyshortcuts` on them.
- Stories (Business/Calendar/Day): WeekNarrow, WeekNarrowLaptop (every block's time ends inside its block), FilterStatuses,
  FilterStatusesAddress, PhoneSheet, PhoneWeek, DateKeys; Phone, MoveSheet, MoveRussianLength now pick the person in the
  sheet. Screenshots: `scratchpad/calendar-2/*.png` of the session (1440 narrow week, 1024, filters, 390 sheet and list).

## Traps

- Storybook's `expect` is async: a helper that loops over blocks must `await` each one (lint's no-floating-promises).
- A story request that overlaps another booking lands in half a column: start only, not the range (WeekNarrow's request
  sits 13:00–15:00 so it has the whole column and shows the timer on its own line).
- `@yeral/ui/select`'s `useSheet` is 767 px; the calendar's phone is `sm` (639 px): the week list uses its own query.

## Left

- The phone's day strip, the top bar's date sheet and swipe between days (B2 390), drag to move in the week.
- The 390 sheet's rows are the DS Select's check rows, not radio circles; the «Today» column header in the sheet.
- The cancelled count while Show cancelled is off (needs a count from the api).
- At 1024 with the full sidebar the toolbar wraps New booking onto a second line when a person is picked (from #317;
  the board draws 1024 with the icon rail).
