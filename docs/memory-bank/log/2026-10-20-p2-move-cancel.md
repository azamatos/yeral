# The business moves and cancels bookings (feat/p2-4-move-cancel)

- Changed: P2 step 4 (book B-26, B-27; F-130, F-131). In the `calendar` module and `@yeral/contract/calendar`:
  - `POST /v1/w/{slug}/bookings/{code}/move` (`moveBooking`): `date`, `start`, `staffId` (another column),
    `notifyClient` (default on). A confirmed appointment before its start (`canBusinessMove` now refuses requests: the
    book's **Code differs** is gone); `off_step`/`past` issues; a booking with the client's move waiting is 409
    `move_waiting`; a plan that doesn't fit is 409 `cannot_move` with `details` `{ problem, staffId, busy? }` from the
    domain's `planRefusal` (`staff_cannot_do`, `staff_off`, `outside_hours`, `elsewhere` with the busy time,
    `overlap`, `buffer`; `checkPlan` reads it). Items move in place (the trigger sets each item's person), the buffer
    after the last service when everything goes to one specialist; `moveRefused` cleared, links extended,
    `booking.moved`, reminders re-planned, the `moved` SMS unless unticked. Specialists the move left hear
    `booking.moved` as the person concerned.
  - `POST …/bookings/{code}/cancel` (`cancelByBusiness`): `reason` (`client_called`, `staff_away`, `other` with
    `text`). `cancelledByFor`: "The client called to cancel" is the client's cancel; the others the business's. Migration
    0022 adds `bookings.business_cancel_reason`; `setStatus` keeps it with the cancel (`StatusChange`), so a restore
    clears it; `canClientRestore` refuses a cancel the team entered (`byTeam`). A waiting move is withdrawn
    (`dropPendingMove(…, 'business')`). The client's booking detail shows the business's reason as a label in their
    language (`businessCancelText`) or the words; none for the client's own.
- SMS: kinds `moved`, `cancelled` (existing text, now sent) and `cancelledAsAsked` (new), all with the link
  (`LINKED_SMS`) and under the client's confirmations switch (Q-286); `queueOutcomeSms` queues the cancels.
- Errors `cannot_move`, `move_waiting`; i18n `businessCancelReasons`, `sms.moved`, `sms.cancelledAsAsked` (en/tk/ru).
- sdk: `calendar.move`, `calendar.cancel`.
- Follow-ups: the booking drawer and the calendar's day view (F-127, the cancelled toggle) come with the calendar
  endpoint; a client's move confirmed to another specialist doesn't tell the specialist it left (requests module).
