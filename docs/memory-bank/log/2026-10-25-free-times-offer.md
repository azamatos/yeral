# Free times to offer a client (slice 3 gap 2, feat/free-times-offer)

- Changed: `GET /v1/w/{slug}/free-times?offer=true` (contract `freeTimesQuerySchema.offer`, `boolQuery`) searches as
  the client would book (`by: 'client'`), as the decline checks its offered times (`rebookQuery`): no start inside the
  lead time, past the booking window or on a service not booked online. Without it, the team's free times as before
  (B-23, B-24). For B4's decline modal (`sdk.calendar.freeTimes(slug, { services, offer: true })`).
- API test (CI): with a day's lead time the team's nearest times fall inside it and the offered ones never do; a
  service off online still books for the team and offers nothing.
- Not here: the declined request's own time still counts as busy in the search (the decline frees it); offering its
  neighbours that overlap it would need the request excluded (`exclude=<code>`), if B4 wants it.
