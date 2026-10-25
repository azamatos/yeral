# Slice 3's shared ui, U3a: ActionBar, TimeSlots and Stepper for the booking flow (feat/ui-booking-flow)

- Changed (`@yeral/ui`, DS-Patterns, COMPONENTS.md rows):
  - **ActionBar** (new, `action-bar`, Actions/ActionBar): the phone's sticky bottom bar: the caller's summary (a
    caption over `Price size="bar"`, or a title over a caption) and `action` (the primary L); a line above, 12 16
    padding plus the safe area. `onExpand` makes the summary a button (`aria-haspopup="dialog"`, `aria-expanded`, a
    chevron) that opens the whole booking in a sheet. A phone pattern: the page hides it from 768.
  - **TimeSlots** (extended): `size` s 36 (min 64) for drawers; `selectionMode="multiple"` with `values`,
    `onValuesChange`, `max` and a live `counter` line («2 / 3 times selected»), each chip a toggle, past `max` the
    others `aria-disabled` (in reach, picking nothing); a slot's `note` under the chip (12/16 n-500, «Already taken»)
    beside the struck-through taken chip, whose `ariaLabel` says why. Group label ids are unique per instance now.
  - **Stepper** (extended, horizontal): `reached` (a step reached before and gone back from opens again, an ink step
    with a white marker); `size="compact"` (a modal's steps, B-Team invite: 24 markers, 20 px separators, no underline,
    wrapping). The move mode's header is the same Stepper with Specialist · Time · Confirm (story FlowHeaderMoveMode).
- Not built (rule 10a, not asked for slice 3's first screens): TimeSlots' Offered chips with the confirm popover
  (the decline alternatives the client books in one tap), the expandable summary's sheet itself (the Drawer's).
- Stories (Russian-length words for each): ActionBar Summary, HiddenPrice, ExpandableSummary; TimeSlots Default,
  SizeS, MultiSelect, Taken; Stepper Reached, FlowHeaderMoveMode, Compact. 28 pass in Chromium (axe included).
