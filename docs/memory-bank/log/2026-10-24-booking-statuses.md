# Booking statuses in Settings → Booking rules (P4 slice 2; feat/booking-statuses)

- **«Booking statuses»**, the last group of Booking rules (B-Settings «r-st», design §8, book B-29, F-104), in
  `pages/settings-rules/ui/booking-statuses.tsx`:
  - The five system statuses, locked («Clients see these · can’t be changed»), each `StatusBadge` with its one icon
    (`BOOKING_STATUS_ICON`: Clock, Check, CheckCheck, X, UserX) and its meaning.
  - The internal statuses from `sdk.settings.statuses` (`GET /v1/w/{slug}/settings/statuses`): Arrived and Started,
    worded by the app (`settings.statuses.presets`), off at first and never deleted; the business's own with «Your own
    status» and a delete. Each switch saves at once (`updateStatus`, the list updated before its refetch); a delete
    saves at once with «“Paid” deleted». «2 / 5 · you can add 3 more»; at 5 «Add status» is off with «Up to 5 internal
    statuses».
  - They save on their own endpoints, not with the rules' save bar. On the board the switches ride the save bar; here
    each is one request, as add and delete already are there.
- **«Add internal status»** (`add-status-modal.tsx`, the board's `statusModal`, 400):
  - a name up to 20 with its counter; «This name is already used — pick another.» for a system or internal status's
    name in any case, and for the api's `validation_error` (a name taken meanwhile);
  - `IconPicker` with 8 icons and `SwatchPicker` with 6 colours (`INTERNAL_STATUS_ICONS`, `INTERNAL_STATUS_COLORS`);
  - the preview: a confirmed block with the chip in its corner, and the pill;
  - Add makes it, switched on, with «“Preparing” added · only the team sees it».
- **`@yeral/ui`:** `SwatchPicker` (Selection/SwatchPicker: a 30 dot in a 44 button, the ink ring and a white check)
  and `IconPicker` (Selection/IconPicker: 44 tiles, 8 to a row, the tint when chosen), both Radix RadioGroup.
- Where things are: the icon maps sit in the page for now. COMPONENTS.md places StatusSettings in
  `features/edit-booking-statuses` and the chip in `entities/booking`; they move there when the calendar's
  InternalStatusChip / InternalStatusSelect need them (steiger refuses a slice with one user).
- Left: changing an internal status's icon, colour or name after it's made (the board draws none; the api's PATCH
  takes them).
