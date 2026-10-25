# Free times a decline may offer (slice 3 gap 2, #219, feat/free-times-offer)

- Changed: `GET /v1/w/{slug}/free-times?offer=<code>` (contract `freeTimesQuerySchema.offer`, a booking code): the
  times that request's decline may offer (B-20), asked as the decline checks its offers (`rebookQuery`): the request's
  services, its own hold free, its specialist first in each start's list (Q-159), as the client would book (nothing
  inside the lead time, past the booking window or on a service not booked online); the strip's days past the window
  are `closed`. The request is loaded as the decline loads it (`answerable`, exported from `requests/service.ts`), so a
  request no longer open, a move (`offer: move`) or a table or class (`not_appointment`) is refused the same way.
  Without it, the team's free times as before (B-23, B-24). For B4's decline modal:
  `sdk.calendar.freeTimes(slug, { services, offer: code })`.
- Decided (Claude, delegated): the request's code rather than `offer=true` (the slice plan's words): the decline's
  question needs the request (its own hold, its specialist); `true` alone answered a different question.
- API test (CI): a client's request with Maral: the team's times count its hold, its decline's don't and name Maral
  first; with a day's lead time and a three-day window the offered times keep both and the days past it are closed;
  the decline takes the first three offered; the declined request is refused (409).
- Not here: a service switched off online since the request offers nothing, silently (as the decline would refuse it);
  B4 can say so if it shows up.
