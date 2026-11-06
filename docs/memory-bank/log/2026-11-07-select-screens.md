# Design v0.7, piece 3: the 19 screens on `Select`, `NativeSelect` gone (branch `feat/select-screens`)

The owner, 04.11 (#28): "using default select, which looks fucking bad. And why this input has more height than
selectors?" `docs/design/CHANGELOG.md` v0.7 → A2 Select (replace every native `<select>`) and A3 Sizes (business
toolbars and forms M 40, client forms and 390 fields L 48; a toolbar never mixes sizes). Follows
`log/2026-11-06-ui-select.md` (the component, PR #310).

- What moved (every caller of `NativeSelect` → `Select`; no screen filtered by several values, so no `MultiSelect`
  yet — the FilterBar comes with A5):
  - `apps/business`, all at M 40: the booking drawer's internal status (`NONE` sentinel for «None»), the address
    fields' city (settings M, the wizard L), block time's person and From / To (`listWidth="content"`, the sheet's
    `closeLabel`), booking rules (lead, window, buffer + «Other…») and `rule-selects.tsx` (`HoldSelect`,
    `CancelSelect`, `BufferSelect` take the ui `SelectProps`), the calendar's specialist picker, the bookings page's
    three filters (`ALL` sentinel; the services list grouped by service group), add client and client edit (source,
    `placeholder` for «Pick»), the service drawer (group, duration, buffer), setup's services and team steps, the
    team member drawer (Admin row `disabled` without the app), add member, remove member (the colleague at M, the
    per-booking «what happens» rows stay S 32), settings profile's category (`loading` until the list lands).
  - `apps/cms` add business: category at M with `placeholder` and `invalid` after a submit without one (the native
    `required` is gone; the submit refuses instead); its inputs and phone at M too.
  - `apps/client`: the search page's radius and sort at M (`DEFAULT_SORT` sentinel, `listWidth="content"`), the
    Where field at L as the search box above it; the home card's When as a bare L trigger in its cell (`TODAY`
    sentinel).
  - A value of `''` never reaches `Select`: cmdk would take the label as the row's value. Every «All / None / today»
    row has a named sentinel mapped back to `undefined` / `null` at the edge.
- `@yeral/ui` (A3): `Input` takes `size` s/m/l (32 / 40 / 48, `rounded-ctl-*`, `text-ctl-*`; L stays the default,
  `InputSizes` story under Inputs/Field); `InputGroup`'s m, `ComboboxInput`'s m and a new `PhoneInput` 40 are 40 as
  `Select`'s m, so a business row (setup's service and team rows, booking rules' «Other…») never mixes heights.
  `NativeSelect` and its import are removed; `SettingsRow`'s story draws the new one.
- Stories: a `pick(trigger, option)` helper per story file clicks the trigger, finds the listbox on `screen` (a
  portal), clicks the row and waits for the list to close; the trigger is checked with `toHaveTextContent(label)`
  (never `toHaveValue`). A disabled row is read in the open list (`aria-disabled`), then Esc. The search page's
  `SearchThisArea` waits 3 s for the lazy MapLibre canvas (1 s raced when the whole file ran).
- Visual check (`scratchpad/select-screens/shoot.mjs` against Storybook on 3205, output in `…/shots/`):
  bookings toolbar (search 40 · three filters 40, the services list grouped and as wide as its rows), the booking
  drawer, the team member drawer's Access level, the client search page at 1440 and 390 (search box 48 · Where 48 ·
  sort 40).
- Left: the rest of the business forms' `Input`s are still L 48 where no select shares the row (add member's name
  and specialization, add client's name, the service drawer's name 44) — A3's own pass moves them to M with
  `Textarea`, `DatePicker` and `PhoneInput` 44 callers; the client search sort at 390 is M (a toolbar), the 390 L
  rule is for fields; the bookings and calendar filters take the FilterButton look with A5; `InputGroup`'s addon
  keeps `rounded-input` (8) until A3 retires the token.
