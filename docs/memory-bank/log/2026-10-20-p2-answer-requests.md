# Answering requests (feat/p2-4-requests)

- Changed: P2 step 4 (book B-19, B-20, B-21; F-124, F-125, F-126). New module `requests`
  (`apps/api/src/modules/requests`) and contract `@yeral/contract/requests`:
  - `GET /v1/w/{slug}/requests`: waiting requests (`awaitingAnswer`), new and moves (`kind`, `from` = the booking's
    time now), by `holdUntil`; a specialist sees the ones they're on. Each has items, price (hidden = 0), note, the
    client's name, phone, visits and no-shows here, `canAnswer` (`canAnswerRequest` in the domain) and `answeredBy`
    (`desk` for a specialist without the app).
  - `POST …/{code}/confirm`: `confirmBooking` under the locks (a move's booking first), so a move moves its booking.
  - `POST …/{code}/decline`: a new request is cancelled by the business with `declineReason`, `declineText` (only
    for "other") and `declineAlternatives` (each `TimeSlot` with its `staffId`, checked by `findAppointmentSlot` with
    the request's own hold excluded; `past`, `not_free`, `duplicate` issues), `answered_at` set; a move gets
    `recordMoveRefused(by business, reason)` and no offers. Both write `booking.declined` and queue the SMS
    (`declined` is a new outcome SMS kind in the jobs: `declinedSmsText`, the reason label or the words).
- Errors: someone who may see but not answer gets 403; a request they can't see 404; answered or expired 409.
- sdk: `requests.list/confirm/decline`; every booking event refreshes `['requests', slug]`.
- Follow-ups: the request drawer's alert notes come with the client card; the calendar's ghost block for moves; an
  undo of a decline must call `assertWaitingRoom`; the 5-minute warning and the answer-time jobs (step 4's timed jobs).
