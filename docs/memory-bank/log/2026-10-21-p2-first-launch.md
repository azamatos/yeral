# The first launch: example businesses, appointments only (feat/p2-first-launch)

- Changed: P2 step 6's first part, book Q-004, Q-030, F-200, S-20 (chapter 9 how-row 21.10.2026, Claude (delegated)).
  Stacked on the add-business PR; no migration.
  - `seedExamples()` (`db/seed/index.ts`): the design's appointment businesses missing by page address, through the
    demo's `seedBusiness` with `example`: marked `demo`, rules `instant`, no accounts or invites (the owner's row keeps
    the app, as the database requires, with no account; the others without it), no reviews of their own, only the
    design's yearly days off, the design's week as drawn.
  - Config `EXAMPLE_BUSINESSES` (`setup` adds them in production), `BOOKING_TYPES` (default `appointment`; tests open
    every kind), `Deps.bookingTypes`; `takesOpenTypes()` / `categoryTakes()` (`catalog/map.ts`) in search, the
    suggestions, the categories, similar places and favourites.
  - Contract `example` on the card, the page and a booking's business (from `businesses.demo`).
  - Infra: the api image carries the design's photos (`/app/demo-photos`), served when examples are on; the server's
    compose sets `EXAMPLE_BUSINESSES: 'false'` and `BOOKING_TYPES: appointment`.
- Tests: `db/seed/examples.test.ts` (added once each, instant, nobody to sign in to, no reviews; a visitor's booking
  confirmed at once and marked; appointments only in categories, search and suggestions).
- The review's findings, fixed: the examples show `EXAMPLE_PHONE` (required with them: Ýeral's support line, which
  the owner still has to give), never the design's numbers, which may be real people's; their specialists have no
  invented ratings; the suggestions leave other kinds' categories out and mark examples; the image's photos are served
  whenever the image has them, so turning the flag off later doesn't break them (hide the examples from the admin tool
  instead; a close can't be undone with no owner account); operations.md says the image carries the photos.
- Follow-ups: the business app's demo workspace (F-242), reset every night; when the Turkmenistan launch comes, the
  examples are hidden or closed from the admin tool.
