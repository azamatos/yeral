# A business that moves tells its clients (feat/p2-address-sms)

- Changed: P2 step 4, book Q-215 revised by the owner (20.10.2026: "Clients should be told via notification if address
  has changed for business, especially clients that have active bookings"), B-37, F-099, chapter 8.
- How (chapter 9, 20.10.2026, Claude (delegated)):
  - A move is a new address line, street or city (`sameAddress` in `@yeral/domain/lifecycle`, with `addressAsShown`
    and `sameAddressShown` for what a client reads); a new pin alone still marks the business for the Ýeral team
    (`addressChangedAt`) but tells nobody. `businesses.moved_at` and `moved_from` (migration 0026): when and from where
    it moved; a fix while the page says "New address" keeps `moved_from`, and a move back there clears both.
  - The profile save queues one `booking.sms` job of kind `addressChanged` per booking ahead (waiting requests and
    confirmed visits not started, no waiting move: its booking hears it), in the same transaction
    (`queueAddressSms` in `bookings/address-sms.ts`), and keeps on each booking the address its client knew
    (`bookings.address_told`, set only when empty). Another save while a job waits moves its time on (one statement);
    a job a runner claimed is under way, so the save adds another. A booking that takes another time (a move
    confirmed, the team's move) brings its waiting SMS forward (`retimeAddressSms`).
  - The jobs word it when it goes (`sendAddressSms` in `jobs/run.ts`): the booking and the business rows read
    `for share`, so an undo or a save under way finishes first; the address as it is, against `address_told`; the
    same, it settles unsent ("dropped: the client knows the address as it is"); sent, `address_told` becomes it with
    the time (`at`; only if unchanged since the job read it). A home-based business's waiting request knows only its
    street, which is what it compares and tells. Every booking SMS that names the address (by phone, the reminders)
    records it too once the business has moved, and a reminder the client hasn't heard the move from says "new
    address" (`sms.reminderDayMoved`, `sms.reminder2hMoved`).
  - Timing in `@yeral/domain/lifecycle`: `ADDRESS_SMS_AFTER_MS` (10 min), `addressSmsAt` (a visit sooner: 30 min
    before it, or at once; never before `firstSmsFrom`, the team booking's undo, which `queueBookingSms` uses too),
    `newAddressSince` (the page's "New address" for `NEW_ADDRESS_DAYS`, 30).
  - It always goes, whatever the client's switches, like a decline. No SMS to past clients or favourites: the page
    says it. Text `sms.addressChanged` (en/tk/ru).
  - Contract: `movedAt` on the business page (30 days) and on a booking ahead once its SMS told the client (detail
    and link page).
- Tests: `bookings/address-sms.test.ts` (one SMS after the last fix, the waiting move, the cancelled booking, a move
  and back, back where it moved from, a pin alone, a visit soon and one under way, the home-based street, a reminder
  first, the team's undo window, a move to an earlier time), domain unit tests.
- Its review (9 findings, 8 fixed): the reminders' address, the undo window, a move back on the page, the booking's
  badge, the re-time, one domain rule for the shown address, one statement for the waiting jobs, the sdk out of the
  changeset. Not taken: folding the address into `told` (its news compare time and people; the address has its own
  record, which every SMS naming it now writes).
- Follow-ups: the address block's save should say how many clients will get the SMS (a **Design to fix** in B-37); the
  SMS caps of step 7 should count these too (a business moving back and forth sends one SMS per booking each time).
