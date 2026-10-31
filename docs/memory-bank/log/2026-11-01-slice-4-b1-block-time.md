# The empty slot and block time (P4 slice 4, PR B1; feat/slice4-b1-block-time)

Slice 4's B1 (`log/2026-10-31-slice-4-plan.md` → "PRs, three lanes", decision 5): a click on a free quarter hour of
the day grid opens the slot menu («14:30 · Maral» + the day: New booking · Block time), and «Block time» the modal of
B-Calendar `panel=block-time | block-error` (B-Mobile 2b–2c as sheets). Flows B-18 and B-14 step 4.

## What's there

- `pages/calendar/model/grid.ts` → `slotsOf()`: the quarter hours a click can land on, `free` or `elsewhere`; none
  under a booking with its buffer, a break, a block, the hours off, or gone by (`cutoff`: the grid's minute now; a day
  gone offers none). Unit-tested in `grid.test.ts`.
- `pages/calendar/ui/day-grid.tsx`: a button per slot (B-Calendar `.qs`, 20 px, «+ 14:30» while pointed at or
  focused, the violet inset ring while its menu is open; named «Maral, 14:30 — new booking or block time», under
  «Busy elsewhere» «… — busy elsewhere»). A click under busy elsewhere toasts «Aýna is busy elsewhere 19:00–20:00.
  Pick another time.» (a specialist: «You’re busy elsewhere …»). The Closed layer shows the block's `kind` translated
  (`blockTime.kinds`), Other's `reason` as written, «Closed» for a block without either.
- `pages/calendar/ui/slot-menu.tsx` → `SlotMenu`: a popover of 220 on a virtual anchor (the slot button) above 768,
  a `Modal` sheet under it (decided with `matchMedia` when the slot is tapped); `role="menu"` with the arrow keys; the
  focus goes back to the slot. «New booking» renders only when the page gives `onBook`: the quick booking is B5's.
- `features/block-time` → `BlockTimeModal({ slug, slot, people, specialist, hours, today, now, bookings?,
  onOpenBooking, onClose })`, modal 400: Person (Select of the columns the reader sees; a specialist their own name
  read-only with «You can block only your own time.»), Date and time (DatePicker named by the group through
  `FieldScope`, From–To Selects by the quarter hour on the grid's hours; From past To pulls To along), Reason chips
  (`ChipRadioGroup`, Other → Input ≤ 30), Repeat (`Segmented`: Doesn’t repeat · Every day · Every week) with Until
  (DatePicker, min the day after) and the caption «Every Wednesday from 14 October to 30 November · 7 times»; Cancel ·
  Block time (off without a reason, with the end before the start, a time gone by, or the api's refusal). The api's
  `block_over_bookings` names the first booking in the way under the times («This time has a booking: 15:30–16:30
  Ejegyz T. · Women’s haircut. Pick another time or move the booking first.» with the client and service when the day
  on screen has it, «Sat, 14 Nov · 15:30–16:30» on another day of a repeat) and «Open the booking» (`?booking=`, B2's
  drawer). Saved: `toast` «Time blocked: Maral · 15:00–16:00 · Training · every week until 30 November» and the view
  refetched (`booked(slug)`), so the block is drawn at once. Rules in `model/block-time.ts` (unit-tested).
- `calendar-page.tsx`: `blocking` state, `BlockTimeModal` under the grid with the view's columns, `gridHours`,
  bookings; `onOpenBooking` goes to `?booking=`.
- Words: `calendar.slot*`, `calendar.slotMenu`, `calendar.elsewhereRefused|elsewhereSelf`, the `blockTime` namespace.
- Stories: `Business/Calendar/BlockTimeModal` (Default, Repeat, Overlap, Problems, SpecialistSelf, Sheet) and in
  `Business/Calendar/Day` BlockTime, BlockOverBooking, ElsewhereRefused, BlockOwnTime, BlockTimeSheet. The stories
  click tomorrow's slots: today's may be gone by when they run (the market's day isn't CI's).
- `steiger.config.js`: `features/block-time` is a one-consumer slice until B5 and the week views open it.

## Decisions (chapter 9, 01.11.2026, Claude delegated)

The slots a click can land on; the form opens an hour long from the slot; a repeat's Until starts four weeks on and
follows the first day; the booking in the way is named with its client and service only when the day on screen has
it; «New booking» joins the slot menu with B5.

## Left

- Deleting a block from the app (`calendar.unblock`, one or the series): not in the row; the api has it.
- The week views (decision 1) draw the blocks when they come; the same `closedLabel` rule.
- `DatePicker` has no `max`: a repeat over a year away is caught by the form's rule («Pick an end date after the
  first day.» doubles for it) and by the api (`too_big`).
