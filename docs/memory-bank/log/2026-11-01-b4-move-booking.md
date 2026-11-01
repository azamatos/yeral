# Moving a booking on the calendar (P4 slice 4, PR B4; feat/b4-move-booking)

Slice 4's B4 (`log/2026-10-31-slice-4-plan.md` → "PRs, three lanes", D3 = A, decision 10): book B-26, F-130, board
B-Calendar `panel=move`. No dragging: «Move to another time» in the booking drawer, then a click on the new slot.

## What's there

- `features/move-booking`: `useMoveBooking` (the booking read on its own, so another day can be on screen; the slot
  picked; `notify`; `confirm`; the refusal's words; Esc), `MoveBar` (`.mvbar`), `MoveConfirm` (`.mvpop`, a sheet under
  768), `MoveGhost` (`.ghost`).
- `entities/booking`: `canMoveBooking`, the drawer's rule moved out so `?move=` obeys it too.
- `pages/calendar`: `?move=<code>` in `search.ts`; `day-grid.tsx` takes `moving`: a free slot picks instead of opening
  the menu, reads «→ 14:30» and «move here», the booking's own time counts as free, a quarter already begun isn't
  offered, the block fades (`BookingBlock.source`) and lets clicks through.
- A shared booking clicked on one of its own columns keeps its people (no `staffId` sent); any other column hands it
  to that person. A click on another booking leaves move mode and opens it, as the board does.
- Stories on `Business/Calendar/Day`: the move, another specialist with the box off, another day, three refusals,
  Back and Esc, a booking clicked, the phone sheet, the Russian length.

## For B8

The row menu's «Move to another time» goes to `/w/{slug}/calendar?move=<code>&date=<its day>`: nothing else is needed.

## Traps

- Radix dismisses a popover before the click for a mouse in Chrome and after it for touch and in tests. A slot picked
  while the popover is open would be cleared by that late dismissal, so a click on `[data-move-slot]` isn't "outside"
  at all: the popover stays and re-anchors.
- jest-dom's `toBeVisible` fails at the first frame of `animate-pop-in` (opacity 0) and of a toast: wait with `waitFor`
  or `findBy…`. Toasts outlive a story: two stories with the same text collide on `findByText`.

## Seen, not done here

- The api takes starts on the business's `slotStep`; the grid offers quarters. At a 30-minute step a click on 14:15 gets
  the generic refusal. The day view could carry the step.
- The view doesn't say who does which service, so «doesn't do this service» comes at Confirm, not at the click.
