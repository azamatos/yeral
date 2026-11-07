# 2026-11-07 · Hours editors on one row pattern (design v0.7 · B1)

**Why:** the owner (04.11, #3/#4): the Break row sat on another level and a basic user wouldn't get the pattern.

**Done (branch `feat/hours-editor`):**
- `features/edit-hours/ui/hours-row.tsx` — `HoursRow`: switch · day name (104) · times on one line · a break as the gap
  between two times («09:00 – 13:00  14:00 – 20:00 ×») · «Add break» (Tertiary S, right end). No Break row. Under 1280 px
  (or `narrow`: the 480 drawer, a phone) the times sit under the name, one per line. One row message, every field invalid.
- Used by Settings › Hours and the setup wizard (`WeekHoursRows`), the staff drawer (`ShiftEditor`: Segmented
  «Business hours · Own shift»; Business hours reads as text; Own shift rows with the faint «{business} is open …» line),
  and the special-day modal («Closed all day» switch, off → the row; no break: the contract has none).
- `TimeRangeField` got `invalid` + `describedBy` (a row-level message). Data shapes and api calls unchanged.
- `hours.addBreak` is now «{day}: add break» (axe: the visible text must be in the name).

**Left:** «Copy Monday to all days» + Undo; the business-window error copy («Glow Studio opens at 09:00. Pick 09:00 or
later.») — today the window is a faint line only; the ⓘ on «Opening hours»; 15-min lists (the contract's `HOURS_STEP` 30
stays); a second break (max 3 times a day) needs the contract; the drawer screenshot shows the page after the story's
Save — the drawer's rows are proved by `DrawerHours` / `DrawerBreakInvalid`.
