# Booking statuses in Settings → Booking rules (P4 slice 2; feat/booking-statuses)

- **«Booking statuses»**, the last group of Booking rules (B-Settings «r-st», design §8, book B-29, F-104), in
  `pages/settings-rules/ui/booking-statuses.tsx`:
  - The five system statuses, locked («Clients see these · can’t be changed»), each `StatusBadge` with its one icon
    (`BOOKING_STATUS_ICON`: Clock, Check, CheckCheck, X, UserX) and its meaning.
  - The internal statuses from `sdk.settings.statuses` (`GET /v1/w/{slug}/settings/statuses`):
    - Arrived and Started, worded by the app (the shared `internalStatuses.*`), off at first and never deleted.
    - The business's own, with «Your own status» and a delete. The delete saves at once with «“Paid” deleted», and the
      focus moves on to «Add status».
    - The count: «2 / 5 · you can add 3 more». At 5, «Add status» is off (`aria-disabled`, still focusable) with «Up to 5
      internal statuses». A failed refetch keeps the list.
  - The switches ride the rules' save bar, as on the board (`model/use-status-toggles.ts`). A flip makes the page dirty,
    Save sends the rules then each flip (`updateStatus`), Discard puts them back.
- **«Add internal status»** (`add-status-modal.tsx`, the board's `statusModal`, 480):
  - a name up to `INTERNAL_STATUS_NAME_MAX` (20) with its counter; «This name is already used — pick another.» for a
    system or internal status's name in any case (`toLowerCase`, as the database folds it), and for the api's
    `validation_error` (a name taken meanwhile);
  - `IconPicker` with 8 icons (4 to a row on a phone) and `SwatchPicker` with 6 colours (`INTERNAL_STATUS_ICONS`,
    `INTERNAL_STATUS_COLORS`);
  - the preview: a confirmed block with the chip in its corner (hidden from screen readers) and the readable pill;
  - Add makes it, switched on, with «“Preparing” added · only the team sees it». The dialog stays while Add is on its
    way, and Add is off once five are there (another tab may add one).
- **`@yeral/ui`:**
  - `SwatchPicker` (Selection/SwatchPicker: a 30 dot in a 44 button, the ink ring and a white check) and `IconPicker`
    (Selection/IconPicker: 44 tiles with 20 icons, the tint when chosen), both Radix RadioGroup.
  - `Button` keeps a caller's `aria-disabled` (it set it only while loading).
- **`@yeral/domain/model`:** `INTERNAL_STATUS_NAME_MAX` beside `MAX_INTERNAL_STATUSES`.
- Where things are: the icon maps sit in the page for now. COMPONENTS.md places StatusSettings in
  `features/edit-booking-statuses` and the chip in `entities/booking`; they move there when the calendar's
  InternalStatusChip / InternalStatusSelect need them (steiger refuses a slice with one user).
- Review (one round, `code-review` high): 12 of 15 findings fixed, all of the above. Left:
  - StatusBadge drawing its own status icons (COMPONENTS.md, D4) would change every app's badges, so it gets its own
    PR.
  - The contract keeps its own `.max(20)` (a contract hot spot; the domain constant is the app's).
- Not built: changing an internal status's icon, colour or name after it's made. The board draws none; the api's PATCH
  takes them.
