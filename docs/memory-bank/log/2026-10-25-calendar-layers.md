# The calendar's layers (P4 slice 3, B2; feat/calendar-layers)

- Changed: each person's column in the calendar's day (`DayColumn` in `pages/calendar`, B-Calendar `.gcol`) draws
  what lies under and beside the bookings:
  - The time they don't work, shaded (n-50): before and after their hours, or the whole day with why. «Day off», «Time
    off» and «Closed · Independence Day» (the last two locked, n-100); someone removed and kept for their bookings is
    shaded with no reason.
  - The quarter lines over the shading, darker on the hour.
  - Their breaks («Break», the coffee cup) and blocked time («Closed · Training», «Closed» without a reason, the lock).
    The screen reader also hears their time.
  - The buffer after each live booking, hatched («Buffer · 10 min» on hover): the buffer after the person's last part,
    up to the next booking and no further than their day's end.
  - Time busy elsewhere («Busy elsewhere», no details, its time for the screen reader). It doesn't take clicks, and next
    to a booking at its time it takes the right half and the booking the left.
  - A client's move waiting at the asked time (`MoveBlock` in `entities/booking`): a request's look, «New time?», the
    client, «from Sun, 25 Oct · 10:30», its timer. Its booking reads «→ Sun, 25 Oct · 16:00?» with the same timer.
    Pointing at or focusing either rings both (n-500). Clicking either picks the booking, where the request is
    answered (B5). At another booking's time the move takes the right half, as a cancelled booking does.
- The night before's blocks, busy time and moves past midnight show from midnight, as its bookings do. Blocked time
  or busy time outside the grid's hours isn't drawn.
- A move counts as a request: in its person's column, on the toolbar's chip and in the day's line.
- `BookingBlock` and `MoveBlock` share one frame. `half` is now `'left' | 'right'`.
- Decided (Claude, delegated; chapter 9, 25.10.2026, B-16 (how), the layers):
  - Busy elsewhere shows without its buffer, because the api leaves the buffer out and the board adds it.
  - Time off shows «Time off» without its note, as the board does.
  - A removed person's column is shaded with no label.
- Follow-up (api): the view carries only the shown day's shift, so on a grid that starts at midnight the night
  before's shift past midnight is shaded as time off (its bookings show over it). Busy elsewhere and a cancelled
  booking beside a live one at the same time share the right half.
- Next: B3, the request drawer (`?request=`), opened from the requests chip, a request's block or a move's.
