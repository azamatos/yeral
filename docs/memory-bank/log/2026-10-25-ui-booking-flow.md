# Slice 3's shared ui, U3a: ActionBar, TimeSlots and Stepper for the booking flow (feat/ui-booking-flow)

- Changed (`@yeral/ui`, DS-Patterns, COMPONENTS.md rows):
  - **ActionBar** (new, `action-bar`, Actions/ActionBar): the phone's sticky bottom bar: the caller's summary (a
    caption over `Price size="bar"`, or a title over a caption) and `action` (the primary L); a line above, 12 16
    padding plus the safe area. `onExpand` makes the summary a button (`aria-haspopup="dialog"`, `aria-expanded`, a
    chevron, 18 in the ink) that opens the whole booking in a sheet. Shown under 1024 (24 at the sides from 768); the
    page hides it from 1024, where the summary card sits beside the steps.
  - **TimeSlots** (extended): `size` s 36 (min 64) for drawers; `selectionMode="multiple"` with `values`,
    `onValuesChange`, `max` and a live `counter` line 8 under the chips («2 / 3 times selected»), each chip a toggle,
    past `max` a tap on another chip does nothing (as B-Calendar draws it, no greyed state); a picked time that turns
    taken counts no more and shows struck (the caller drops it from `values` on its refetch); a slot's `note` under
    the chip (12/16 n-500, 2 in, «Already taken») beside the struck-through taken chip, whose `ariaLabel` says why.
    Group label ids are unique per instance now.
  - **Stepper** (extended, horizontal): `reached` (a step reached before and gone back from opens again, an ink step
    with a white marker) and `canOpen` (a reached step gone stale stays closed); `size="compact"` (a modal's steps,
    B-Team invite: 24 markers, a 12 check at stroke 3, 20 px separators inside their step's item so a wrapped line
    never ends on one, radius 8, no underline). The move mode's header is the same Stepper with Specialist · Time ·
    Confirm (story FlowHeaderMoveMode).
- Not built (rule 10a, not asked for slice 3's first screens): TimeSlots' Offered chips with the confirm popover
  (the decline alternatives the client books in one tap), the expandable summary's sheet itself (the Drawer's).
- Stories (Russian-length words for each): ActionBar Summary, HiddenPrice, ExpandableSummary; TimeSlots Default,
  SizeS, MultiSelect, PickedThenTaken, Taken; Stepper Reached, ReachedStale, FlowHeaderMoveMode, Compact. They and the
  setup wizard's (the vertical Stepper) pass in Chromium (63, axe included).
