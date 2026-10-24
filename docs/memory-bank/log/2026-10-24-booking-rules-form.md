# The booking rules form, shared by the wizard and Settings (P4 slice 2; feat/booking-rules-form)

- **`features/edit-booking-rules`** (apps/business): the wizard's rules model moved out of `pages/setup` and grew to
  every rule Settings → Booking rules sets (B-Settings `isRules`, design §8 and §28.5, book B-05, B-41, B-42):
  confirmation, hold, who answers, minimum notice, how far ahead, buffer (presets or «Other…» 1–120), time step, free
  cancel window, ask for a reason, no-show limit. `useRulesForm(slug, on)` loads the rules and the team, keeps the edits,
  sends only what changed (`PATCH …/settings/rules`), `discard`s, and gives `dirty` / `valid` / `saving` / `modeChanged`
  / `askWho` for a save bar. `BookingRulesForm` is the Settings body in its four groups (Confirmation, Who answers
  requests?, When clients can book, Cancelling, lateness and no-shows) with the «Requests already waiting keep their
  timers…» note and the fixed «Clients may be up to 15 min late» row; `useRuleLabels()` writes the choices the same in
  both places. The copy lives in the new `bookingRules` namespace; `setup.rules` lost its duplicates.
- The hook's form belongs to one slug (the switcher keeps the Settings page mounted across workspaces) and, while
  nothing is edited, follows the rules as they reload (another admin's change, a live update). «Other…» starts at 25
  (B-Settings `bufCustom`) and takes figures only, three at most.
- The wizard's step uses the hook and `HoldSelect` / `CancelSelect` / `BufferSelect` from the slice; it looks and saves
  as before (its stories pass unchanged). One edge changed: after a save the form shows what was saved, so a hold
  changed in manual mode and then hidden by instant confirmation comes back as stored, not as typed.
- Review (one round, `code-review` high): all 13 findings fixed (the slug and reload above, the first-load guard, the
  stepper's off ends and `onKeyDown`, the buffer box's filter and description, the shared selects, the story title from
  COMPONENTS.md, `Business/Settings/BookingRules`).
- **`NumberStepper`** (`@yeral/ui/number-stepper`, Inputs/NumberStepper; DS-Patterns `.y-stp`): − n + in one 44 box,
  `format`, ↑/↓, `wide` for a unit; an end button is `aria-disabled` so the focus stays on it at `min` / `max`.
- `choicesWith` moved to `shared/lib` (the services step uses it too).
- Left for the Settings page (phase 2, in fork A's frame): the header, the paused note («Online booking is paused —
  Resume it in Business profile»), the save bar, the «What the client sees» preview (`holdUntil` in
  `@yeral/domain/lifecycle` gives «The business answers by …»), and the buffer's «Set per service: … · Services» line
  (needs the menu's per-service buffers and the Services section's link).
- Not here: the internal statuses (the status list and «Add status»), their own piece; online booking's switch is
  «Pause online booking» in Business profile (§28.5), so the form leaves `onlineEnabled` alone.
