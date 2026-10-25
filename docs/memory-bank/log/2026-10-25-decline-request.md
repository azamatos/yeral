# Declining a request (P4 slice 3, B4; feat/decline-request)

- Changed: the request drawer's footer is «Decline» beside «Confirm». Decline opens «Decline the request» (B-Calendar
  decline modal, DS-Business DeclineRequestModal, book B-20; `pages/calendar/ui/decline-modal.tsx`):
  - «The client will see the reason.», then the request in one line: «Mähri G. · Hair colouring · Sunday, 25 October ·
    11:00–13:00».
  - The reason, as chips: «This time isn’t free», «No specialist free», «We can’t do this service», «Another reason».
    «Another reason» opens a field, up to 200 characters, that the client sees.
  - «Offer another time», a switch. Turned on, it shows the nearest free times grouped by day, and up to 3 can be
    picked («2 / 3 times selected»). They are searched as the decline checks them: `freeTimes(slug, { services, offer:
    code })`, the request's specialist first, its own time counted as free, the lead time and the booking window kept.
  - «Back» and «Decline» (danger). Decline stays off until there's a reason, and words for «Another reason».
  - A refusal (a time taken meanwhile, the request gone) shows in the modal, and the times are read again.
- After a decline the drawer closes on that request. The toast is «Request declined · the client sees the reason and 2
  other times», with «Next request» while more wait.
- A client's move is declined the same way, with the reason only: «Decline the new time», «The client will see the
  reason. The booking stays at its time.», with no «We can’t do this service» and no offered times. Its toast is «New
  time declined · the booking stays at its time · the client sees the reason».
- Review round:
  - The decline runs in the drawer, so its toast lands even if the request has already left the list. The modal stays
    open while a decline is on its way, and closes if the request goes meanwhile (answered elsewhere, or run out).
  - A refusal reads the requests again.
  - Picks no longer offered drop out of the count.
  - The declined time itself isn't offered back.
  - «Today» is the business day.
  - A request whose services are off the menu offers no times: the switch is hidden.
- Decided (Claude, delegated; chapter 9, 25.10.2026, B-20 (how)): the times offered are the nearest 4 free starts in 14
  days, grouped by day. The board draws three times of the same day; the modal has no date picker for now.
- Next: B5, the move request's box (Previous time / New time with Show, the fit line from W's `fits`).
