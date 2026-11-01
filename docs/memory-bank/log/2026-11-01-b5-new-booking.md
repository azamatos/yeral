# The new booking drawer (P4 slice 4, PR B5; feat/b5-new-booking)

Slice 4's B5 (`log/2026-10-31-slice-4-plan.md` → "PRs, three lanes", decision 6): book B-23, B-25, board B-Calendar
`panel=new`.

## What's there

- `features/create-booking`: `model/new-booking.ts` (pure, tested: who does all the services, whose booking it is, the
  total, the walk-in's quarter, what's still needed), `ui/new-booking-drawer.tsx`, `ui/client-field.tsx` (the number,
  matches from 3 digits, the known client's card with alert notes, a new client's name, search by name),
  `ui/service-picker.tsx` (grouped rows, Total, only the given person's unless asked).
- `pages/calendar`: `?panel=new&staff=&start=&client=&services=`, the toolbar's «New booking», the slot menu's item,
  `onBookAgain` on the booking drawer.
- `@yeral/ui` `ChipRadioGroup`: an option can be `disabled` (it ignored that before, silently).
- `@yeral/contract`: `ClientMatch` type exported (the business app has no `zod`).
- Stories on `Business/Calendar/Day`: known client with Undo, a new number, by name, from a slot with no one doing all
  the services, a walk-in, a specialist, «Book again» from the address, the Russian length at 390.

## For B6, B10, B11

- B6's sheet can reuse `new-booking.ts` as it stands; `usualServices` on the lookup is there for its chips.
- B10 and B11 reach it by the address: `/w/{slug}/calendar?panel=new&client=<id>`.

## Traps

- Callbacks given to `mutate` don't run once the component is gone: a toast's Undo after the drawer closed said
  nothing until it used `mutateAsync().then`.
- A label's visible words must be in its accessible name (axe `label-content-name-mismatch`): no `aria-label` on a time
  chip that shows «Tomorrow 10:00»; the full date goes in `sr-only` after it.
- `ChipRadioGroup`'s `options` accepted `disabled` in a mapped literal without a type error while dropping it.

## Seen, not done here

- «Frequent clients» on the empty name search: needs a client list sorted by visits (`clients.list` has no such sort).
- At `slotStep` above 15, a prefilled start from the grid may not be a free start: the drawer says it isn't long enough.
