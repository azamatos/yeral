# The booking flow's confirmation and sent page (P4 slice 3, C4; feat/client-booking-confirm)

- Changed: step 4 (`pages/booking/ui/confirm-step.tsx`, Booking `step=confirm`, book C-18, C-20, C-21): the title, a
  time taken meanwhile (`slot_taken`: the nearest free times as chips, one tap picks it, «Choose another time» back
  to the time step), the summary under 1024, «Your details» (signed in with a name: their name and the number with
  its check; otherwise the line and «Confirm your number», which opens the site's login over the page: number,
  code, "Is this you?", the name), the note for the business (500, counted), the business's rules (the free cancel
  window, lateness, pay at the place, the business's own note). «Send booking» in the summary and the bar, off until
  someone signed in with a name: `sdk.bookings.create`; paused meanwhile or phone-only (`online_blocked`,
  `online_disabled`) goes back to the business page (its call card); any other refusal is a toast.
- The sent page (`ui/sent-view.tsx`, Booking `step=sent`) at `?sent=YR-…` (a reload keeps it; the confirmation is
  replaced, so Back doesn't send again): «Booking sent» and Pending, or «Booking confirmed» for an instant business;
  the booking's card (services with minutes, specialist, time, address, total, code) from `GET /me/bookings/{code}`;
  what happens next (`Timeline numbered`: sent, the business confirms by its answer time, you come in); Go to my
  bookings (`/account` until C5), Add to calendar, Home. No SMS is promised (Q-036).
- `@yeral/lib/ics`: `buildIcs()` (RFC 5545: UTC, escaped text, folded lines; tested); the client's
  `shared/lib/download.ts` saves the file (the lib package has no DOM).
- `shared/storybook`: `businessApi()` sends a booking (`POST /bookings`), reads it (`GET /me/bookings/{code}`) and can
  have a start taken first (`taken`).
- Departs from the board: the sign-in for a booking opens the site's login over the page instead of fields drawn inline
  (the same steps and checks, one place to keep them); «Change» beside the signed-in number and the terms line under
  Send (slice 7, Q-033) aren't there yet.
- Stories: `Client/Pages/Booking` (15: signed out, send and the sent page, instant, taken, phone, an unreadable sent
  page).
- Review (one round, 15 findings, 13 fixed): the sent page says when it can't read the booking (signed out, another
  person's) and points to My bookings; the taken alert belongs to its date and time (any other time leaves it) and
  Send stays off during it («First choose a new time.»), the day's free times marked old for the time step, the chips
  named «Choose 16:00»; while sending and once sent the page stays on the confirmation (the sdk refreshes the free
  times before the page moves on, so nothing sends twice and the time step doesn't flash); the sent page keeps its
  route on a reload whatever the business did after (the loader's redirect skips `?sent=`) and has its own title; a
  booking no longer waiting or confirmed says only its status; this page's business speaks for the lead and the rules
  only when it's the booking's; the address with its city; the `.ics` PRODID, file name and the service lines from the
  words; the file's address revoked on the next turn (Safari); «(optional)»; the login modal kept once opened and the
  focus back on «Your details»; `me.name` and `fmt.phone`; the fake's codes count up. Left: `NOTE_MAX` repeats the
  contract's private `noteSchema` limit (exporting it is a contract change); the fake booking is cast, not checked
  against `bookingDetailSchema`.
