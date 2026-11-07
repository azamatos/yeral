# 2026-11-07 · booking steps (design v0.7 · C4, owner's #39 #41 #50 #51)

Branch `feat/booking-steps`.

## Done
- **Auto-advance (#39):** a service picked moves straight on (`stepAfterPick` in `pages/booking/model/flow.ts`): to the
  specialist, or to the time when the specialist is answered already (`?staff=`, «any» included); a specialist picked
  moves on to the time (or to their services while none is picked). One new history entry per pick, so Back returns to
  it. The staff step's radio cards advance on a click, Space and Enter, not while the arrow keys walk them.
- Only Time (once a time is chosen) and Confirm have the primary (`stepHasAction`); the services and specialist steps
  have none, on the card and on the phone bar.
- The stepper shows plain step names (done steps with the check); from a specialist's «Book» a DoneStep card
  («Specialist · Maral · role · rating · Change») sits above their services. The «See all services» toggle is gone.
- **Summary card (#41, C4.4):** «Your booking» + Clear (Tertiary S, back to the first step, Undo in the toast); mini
  business head; services with × from two up; «Add a service» (opens the services step, a pick returns to the time);
  Specialist and Date and time rows with Change; Total + duration muted + price 24/32 700, «Pay at the place» with a
  wallet icon 4 under it; gaps 12/20/4/24. The business page's booking card got the same hierarchy (Clear in its head).
- **Confirm (#50, #51, C4.5):** the card becomes the booking card: photo 120 (16:9 strip on phones), name 20/28,
  rating, address with «Get directions», the booking as facts (Date and time, Services, Specialist, Duration), total.
  The signed-in row is a bordered account row with a «Verified» badge (completed tones) instead of the green check.

## Left
- «Add a service» as the board's popover / phone sheet (now it opens the services step); keeping the time when it
  still fits (a new service still clears it).
- SpecialistRow / service rows as buttons with a chevron and the 150 ms tint (the existing radio cards and Select
  buttons stay); the service search on the step.
- The StatusPill for the booking day on the confirm card; the inline Telegram code; «Not you?»; the phone summary sheet.
- Screenshots at 1440 / 390 weren't taken (context limit).
