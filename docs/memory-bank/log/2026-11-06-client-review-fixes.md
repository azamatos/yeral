# Client site: the owner's #7, #17, #18, #19, #39, #40 and #44 of 04.11 (`fix/client-review-fixes`)

- What's there: the business page's category crumb and the meta line's category open `/{lang}/c/{category}`
  (`BusinessDetail.category.id` is the slug; no contract change). The booking card's hours row is two lines, today's
  hours and the open line («Closed · opens tomorrow at 10:00»); the header's meta says only «Open now» / «Closed»
  (`business.openNow`). The «Example» badge and the «This isn't a real business…» notice are gone from the business
  page, the tiles, the rows and the places nearby (`@yeral/ui`'s `ExampleBadge` stays for the business app); the api's
  `example` flag and its instant confirmation are untouched. No «demo» in the client's copy: the sign-in note reads «For
  now the sign-in code shows here instead of coming by SMS…» (`login.demoNote`, the key kept) and the static pages say
  «The site is in development». «Home» after a booking or a move is sent is a secondary button; the «Bookings are
  confirmed at once» box's icon is `a-600`.
- The booking's steps (#39): `stepsOf(first)` in `pages/booking/model/flow.ts`. A specialist's «Book» on the business
  page adds `?first=staff` to `?staff=`, and the flow's order becomes staff → services → time → confirm, opening on the
  services: the specialist is a done first step in the stepper («Maral · Change», `booking.steps.chosen`), which opens
  the choice again; nothing stops at them on the way (`reachedStep`, `currentStep` and `stepDone` take the order).
  Without it the order stays services → staff → time → confirm (the business page's Continue sends `step=staff`). Back
  from the services and from the first step is the business page. «See all services» / «Only Maral's» is a text button
  on a line at the list's head, not a grey band.
- Decided (Claude, delegated): the entry is a search param (`first`), not read from `?staff=` alone, because a
  specialist picked on the staff step sets the same `?staff=` and the stepper must not reorder mid-flow. With nothing
  picked yet the done step names the address's specialist (`chosenStaff` answers «any» until a service is picked);
  once a picked service rules them out it reads «Any specialist · Change», as the summary does. After «Change» Continue
  goes through the services again (the new specialist may not do them).
- Traps: a stepper button's accessible name is its number and label («2 Services»); a done step's is the label alone.
  `Summary` shows the specialist from the staff step on (`index >= steps.indexOf('staff')`). The story suite and the
  e2e ran in CI only; locally the changed story files ran with `vitest run <pattern>` in `apps/storybook`.
- What's left: the auto-advance on a single pick waits for the new design (not built); the hero and the stepper's
  collapsed done steps are in the design brief (review A #18–#20, B #39–#40); `pages.en.json` still says the businesses
  are examples (true, and no badge marks them now); `DEMO_WORKSPACE` and the business app's «demo workspace» copy are
  the owner's call (#44).
