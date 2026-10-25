# Russian-length check of slices 2 and 3 (plan P3, book Q-101; feat/storybook-longer-text, feat/russian-length-fixes)

- The tool: Storybook's toolbar «Text: Russian length (the apps' pages)» (`?globals=text:longer`). `@yeral/i18n`
  `stretched()` lengthens every app message with whole words of filler after it (never inside an `{argument}` or a
  `<tag>`), counting only the letters it shows (not tags or values; a plural's longest branch): up to 4 letters by
  100 %, up to 10 by 60 %, up to 20 by 40 %, longer by 30 % (Russian lengthens short labels most); the brand and file
  names stay. The formatters' words (days, months, durations, prices) stretch too. Both apps get their words through
  `appMessages(shared, own)`, which is the messages themselves outside Storybook. The story tests run as written.
- The check (25.10.2026, at 390 with the longer text, every story of: Client/Pages/Business, Booking, MyBookings;
  Business/Onboarding/SetupFlow, Business/Settings/*, Business/Access/LoginFlow, Business/Calendar/Day; a script in the
  page looked for a page scrolling sideways, text spilling out of its box and text cut by an `overflow` without an
  ellipsis):
  - the booking's time step scrolled sideways on phones, as written too: the date strip's hidden day words (sr-only,
    absolute) sat outside its scroller → the strip's scroller is `relative` (#242);
  - the setup wizard's phone header pushed «Continue later» past the edge → the words alone (no icon), up to half the
    row, wrapping and shrinking, 32 high, as B-Onboarding `.mb` draws it (#242);
  - the photo grid's «Cover photo» chip and «Make cover» were cut inside a tile → they wrap inside it (#242);
  - nothing else in those stories (the business page, My bookings, Settings, the calendar's day: none).
- Checked again with #242 and the tiered lengths (#238's review), the review form's stories added: 233 stories at
  390, nothing overflows.
- Left: the wizard's phone header has no room for «2 / 8 · Business» beside the lockup with its «Business» pill (as
  written too; the board's lockup is narrower); 1440 wasn't scanned (more room); on phones the date strip doesn't
  scroll the picked day into view (older; a follow-up).
