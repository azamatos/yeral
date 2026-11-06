# Design v0.7, piece 2: the figures rule and grouped phones (A1 Figures, PR #309, `fix/figures-phones`)

- The rule (DS-Type 04, `docs/design/screens/system/DS-Type.dc.html`): figures are proportional everywhere; `tabular-nums`
  stays in exactly three places — numeric table columns, the calendar's time grid and running timers / countdowns. Never on
  phones, prices in text, time chips, dates, stat tiles, the code boxes or headings. Rule of thumb: tabular only when a number
  sits above numbers of the same kind and must line up, or when it ticks.
- What's there: 116 `tabular-nums` found (104 in code, 12 in stories); 96 removed from code — phones, prices in cards and
  drawers, time chips (`TimeSlots`, the client's `time-chips`), dates and the date strip, stat tiles, `Callout`'s value,
  `CountBadge`, `AvatarStack`'s +N, `Pagination`, `Stepper`, `NumberStepper`, `Drawer`'s pager, `Field`'s counter, `Select`
  S, `InputGroup`'s suffixed input, `CodeInput`, `PhoneInput` (the masked box also lost its `tracking-[0.02em]`),
  `CopyField`, `KeyValue` facts, the menus' captions, the month calendars' day buttons, the calendar's booking blocks and
  the move ghost, the sign-in steps' phone lines. Stories: 9 class usages dropped, 3 assertions flipped (`Select` S time,
  `TimeRange`, `StatTile`: `normal`, not tabular).
- Kept (8 original places + 1 new): `TimerPill`, the affected-bookings `role="timer"` pill, `SignInCodeStep`'s «Send a new
  code in 0:42» (disabled state), the day grid's hour labels and now pill, its slot-time labels, the week view's hour
  labels, `RatingDistribution`'s five counts, and `TableCell numeric` (new, with `TableColumnHeader numeric`): right-aligned
  tabular figures for a column of counts or money — the clients list's Visits and Total, the client card history's Price.
  The table rows' phone, date and «next» columns are proportional like every other cell.
- Phones: one formatter, `formatPhone` in `@yeral/domain/phone` (`fmt.phone` in React), by `MARKET.phone` — nothing
  hard-coded. Six places showed the stored E.164 raw and now group it: the bookings table's and requests tab's row note,
  the clients list (phone list and table cell), the new booking's match row, the setup wizard's owner line. `formatPhone`
  now leaves a number of another country (`+7 …`) as given instead of regrouping it as a Turkmen one; `phone.test.ts`
  covers the one output for every input shape, incomplete input and a foreign number.
- Checks: lint, typecheck and unit tests of ui / features / client / business / cms green (the api's tests need Postgres and
  stay CI's); the touched stories run in Chromium. Before / after screenshots at 1440×900 (clients list, booking drawer,
  client card head, search results' time chips) in the PR body.
- Left: the `Table` has `numeric` but no `SortableHeader`, `RowLink` or `PhoneCell` yet (A6, DS-Lists); `SignInCodeStep`'s
  on-screen «Your code» callout still has its 0.08 em tracking until B10 removes it; the month calendars (`Calendar`,
  `DatePicker`) could take tabular day numbers back if the owner finds them uneven — DS-Type calls them proportional.
