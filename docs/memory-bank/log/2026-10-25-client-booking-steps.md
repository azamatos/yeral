# The booking flow's first three steps (P4 slice 3, C3; feat/client-booking-steps)

- Changed: `/{lang}/b/{slug}/book` (`pages/booking`, route `$lang/b.$slug.book.tsx`, outside the site's header and
  footer) replaces the stand-in: the focused header (Back: to the page from step 1, else the step before; the
  steps through `@yeral/ui`'s Stepper, «2/4 · Specialist» under 768; Close back to the page with the picked
  services), then one step at a time with the summary beside it from 1024 and U3a's ActionBar under it.
  - Step 1 services: the same picker as the business page, moved to `features/pick-services` (`ServicePicker` and the
    selection rules; the page gives the heading, the picker its groups' level).
  - Step 2 specialist: «Any specialist» with the earliest free time, everyone who does the picked services with their
    next free time (`sdk.availability.specialists`), the others disabled saying why, the note when nobody does them
    all.
  - Step 3 time: `DateStrip` with the api's 14 days (closed off, full struck through), the day's title (Today /
    Tomorrow), `TimeSlots` by part of day (before 12:00, before 17:00, the evening), and for a day without a time the
    way to the next free day (`sdk.availability.appointment`).
  - Step 4, the confirmation, is a title and a line until C4.
- Everything picked is in the address (`bookingSearchSchema` in `model/flow.ts`: `services`, `staff`, `date`, `time`,
  `step`; unreadable values dropped): a step change is a new history entry (Back walks the steps), a pick replaces it;
  a new service drops the chosen time; a specialist who doesn't do every picked service becomes «any»; a link to a step
  past what's chosen opens the furthest step reached (`currentStep`, tested).
- `shared/storybook`: GLOW has its four specialists and `businessApi()` answers the specialists' and the days' free
  times; `FakeRequest` carries the query.
- Stories: `Client/Pages/Booking` (9).
- Review (one round, 15 findings, 13 fixed): the step shown goes into the address with every change (a link held back
  to an earlier step no longer jumps ahead on the next pick); `time` is the start in minutes of the business day (up
  to 2879: a start past midnight round-trips, book Q-105) and counts only with its `date`; a date already past counts
  as none; the page reads the chosen day's free times too and a time the day no longer has isn't chosen (Continue
  waits); while another day's times come the old ones aren't offered; a failed free-times answer says so with Try
  again (both steps); up to 10 services (`SERVICES_MAX`, the api's limit; a toast past it, on the business page too);
  the specialist step on `@yeral/ui`'s OptionCard (arrow keys, the n-500 ring); a specialist ruled out by a new
  service leaves the address; the same specialist again keeps the time; the header's Back and the step links replace
  the entry (Continue alone adds one); the strip opens on the week of the chosen day; the route sends a page nothing
  can be booked on (`bookOnline` false: paused, phone-only, the owner's preview; or not appointments) back to the
  business page; a next free time past midnight reads on the next day (`calendarAt` in `shared/lib`, the business
  page too); the summary takes the total and the name from the page; the steps' enum is `STEPS`. Left: the API's
  answer for a day without `date` is today even when today is closed or full (the empty state offers the next free
  day, as the board does); one `widgets/booking-summary` for the page's card and the flow's summary (COMPONENTS.md),
  with C4's variants.
