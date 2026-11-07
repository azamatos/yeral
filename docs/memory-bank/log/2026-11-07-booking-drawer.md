# 2026-11-07 · Booking drawer (design v0.7 · B4) and what B7 needs

Branch `feat/booking-drawer`, worktree `.claude/worktrees/shared`. Owner's complaints #6 (the drawer's status strip,
«Call» and «Book again» out of sync, the card link, the hint line), #35 (the client search in New booking) and #36
(«Show all services» isn't a button).

## Done — B4 Booking drawer

- `@yeral/ui` **InfoTip** (`packages/ui/src/components/info-tip`, A9): a 16 px ⓘ that opens a 280 popover (named by
  `label` for axe's `aria-dialog-name`). `Field` has an `info={{ label, text }}` prop: the ⓘ sits after the label, outside
  the `<label>` so a click on it isn't a click on the control.
- `apps/business/src/widgets/booking-drawer/ui/booking-drawer.tsx`: the status and the source as two equal badges
  (`SourceBadge`: «Booked online» / «Booked by phone» / «Walk-in», a tooltip each; a cancelled booking keeps its source
  and says who cancelled after the badges); the internal status and the internal note with the ⓘ, no hint lines; the note's
  line under the field is the state alone («Saving…», «Saved»), nothing before anything's typed (the board: typed → «Saved»).
- `client-block.tsx`: the client as one card — name = link to the card, the number through `CopyField variant="inline"`
  (Copy the number → «Copied»), tags (segments + the team's tags; Reported in the danger tone; Phone only with a ⓘ that
  says why), facts as a `dl` grid (Visits · Last visit · No-shows only when > 0), alert notes as note rows with «by · date ·
  Shown when booking», Call and Book again as two equal Secondary M. No average check in the drawer any more (no sums).
- Stories updated (`booking-drawer.stories.tsx`): popovers and tooltips checked after `waitFor`. Run green: `info-tip`,
  `booking-drawer`, `report-and-cancel`, `calendar-page` (55).

## Left — B7 New booking (not started in code)

What the board asks (`docs/design/screens/business/B7-Booking.dc.html`, section B7) and what the repo has:

- **One ClientCombobox** (names or digits detected, ≤ 8 rows with the grouped phone and «Last visit · visits», the match
  in 700, «Showing 8 of 23 — keep typing», «Frequent clients» before typing, «+ New client “…”» last, inline New client
  form with the known-number warning, chosen chip with Change + NoteRow). Data: `sdk.clients.list(slug, { q, sort: 'visits',
  limit: 8 })` gives `ClientRow` with `visits` and `lastVisit`, `counts.all` is the «of 23», and `q` already matches a name or
  digits anywhere in the number (api `searchOf`). The lookup (`clients.lookup`) returns at most 3 and no `lastVisit`, but it's
  the only call with `alerts` and `usualServices`: keep it for the chosen client (by their full number, as today's `known`).
  `@yeral/ui` `Combobox` renders the list in the flow (not a popover) with rows 52; it needs a row renderer that takes the
  match highlight and the right-hand meta, or the rows go in the feature.
- **ServicePicker**: Segmented «{name}’s services · All services» full width (first option disabled with a ⓘ until a
  specialist is chosen), a search field over the list, a 300–420 high list box with sticky group headers and counts,
  «{name} doesn’t do this» in All services, the summary line with removable chips, the warning callout with «Change the
  specialist». Today's `service-picker.tsx` has the Segmented already; drop the «Show all services» link wording.
- **Trap:** `apps/business/src/pages/calendar/ui/calendar-page.stories.tsx` (lines ~1100–1260) drives the old client field
  («Phone number» textbox, «Search by name», «Show all services» radio, `clients/lookup` in its fake api) and reads
  «12 visits · average check …» on the chosen client. B7 breaks those plays; the fake api needs `GET /w/glow-studio/clients`
  (the list with `q`, `sort`, `limit`, and `counts`). That folder was the calendar agent's on 07.11, so B7 waits for it, or
  the two land together.
- Not done from the B4 board: the details as a two-column fact grid (`.dets`; `KeyValueList` stays), the 390 sheet with L
  controls and Cancel booking as the sheet's last item, the no-show callout with Remove report (B3's report box stays).
