# 2026-10-23 · The setup wizard's hours step (P4 slice 2)

- `@yeral/ui` (#158): **TimeRangeField** (`time-range`; DS-Patterns → Inputs): two 40 × 104 native selects (opening
  00:00–23:30, closing 00:30–24:00, `step` minutes; the hours pass the contract's `HOURS_STEP`), the value as
  `@yeral/domain/hours` keeps it (`{ open, close }`, a close past 1440 is the next day's, shown with the slate «until
  02:00, next day» pill that also describes the closing picker), `dayStart` for a break inside a day (both times that
  day's, a time before its opening the night's), `label` + `remove`, `children` (the «+ Break» link), `error`.
  **Select** gained sizes 48 / 44 / 40 (`size="l" | "m" | "s"`) and tabular figures.
- `@yeral/domain/hours`: `dayHoursProblem(week, day)` says why a weekday can't be saved (same time, into the next
  day's opening, a break ending before it starts or outside the hours); `weekHoursErrors` uses it, so the api now
  refuses opening and closing at the same time too (a full day only 00:00–24:00). `@yeral/contract/settings` exports
  `WeekdayHours`.
- The business app, `pages/setup`: the hours step (`ui/hours-step.tsx` `useHoursStep`, on the address step's
  `StepAction` pattern from #162; `model/hours.ts`): «Same hours Monday to
  Friday», a row per weekday (switch, hours, break, the day's problem under it), the note on hours past midnight and
  special days; the footer's hint («At least one day must be open.», «Check the times.»); `save` puts a valid week
  that isn't the saved one through `settings.updateHours` (with the special days as they are), and Continue moves the
  draft to services; the step list's summary once a week is saved («Mo–Fr 09:00–18:00, Sa 09:00–20:00»). Delegated choices: chapter 9, 23.10.2026 (B-04, F-097).
- The week editor sits in `pages/setup` for now (FSD: one user); it moves to `features/edit-hours` (COMPONENTS.md
  `features/edit-hours/ui/week-editor`, `entities/business/ui/hours-row`) when Settings → Hours uses it.
- Next: step 5 · Services (InputGroup in `@yeral/ui`, the category's starter services, «Add a service»).
