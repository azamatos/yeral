# Settings → Booking rules (P4 slice 2; feat/settings-booking-rules)

- **`pages/settings-rules`** in Settings' frame (`/w/{slug}/settings/rules`; B-Settings `isRules`, design §8 and §28.5,
  book B-05, B-41, B-42):
  - `SettingsPage section="rules"` with its lead, `BookingRulesForm` (`features/edit-booking-rules`, #176), and
    `SaveBar` while the form is dirty: Save off while the buffer «Other…» is out of range, «Saved» in a toast after.
  - The paused note («Online booking is paused — clients see a Call card. Resume it in Business profile»), read from
    the rules' `onlineEnabled`; the switch itself is Business profile's.
  - The buffer's «Set per service: Hair colouring — 15 min · Services» from the menu's `bufferMin`, through the form's
    new `bufferNote`.
  - **«What the client sees»** (`rules-preview.tsx`, the frame's `aside`; beside the rules from 1408, under them below
    it, as `.pv`):
    - manual: «Booking sent», Pending, «The business answers by 15:10» (`exampleAnswerBy`: a request sent today at
      14:40 for tomorrow 14:30, the hold counted with `holdUntil` over the business's hours, so today or «… tomorrow»);
    - instant: «Booking confirmed»;
    - paused: «Book by phone» with the profile's number;
    - under it the example booking (the name, the first service, the first bookable person) and the free-cancel rule.
- The form's groups now use `SettingsSection` / `SettingsSectionTitle` from `@yeral/ui/settings-layout`. Settings' save
  bar words are `settings.save.*`, for the other form sections too.
- The steiger override for `features/edit-booking-rules` is gone: the wizard and this page both use the slice.
- Not here: the internal statuses (the list and «Add status») are their own piece.
