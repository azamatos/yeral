# A business that moves tells its clients (feat/p2-address-sms)

- Changed: P2 step 4, book Q-215 revised by the owner (20.10.2026: "Clients should be told via notification if address
  has changed for business, especially clients that have active bookings"), B-37, F-099, chapter 8.
- How (chapter 9, 20.10.2026, Claude (delegated)):
  - A move is a new address line, street or city (`sameAddress` in `settings/address.ts`); a new pin alone still marks
    the business for the Ýeral team (`addressChangedAt`) but tells nobody. `businesses.moved_at` (migration 0026) is
    when it last moved.
  - The profile save queues one `booking.sms` job of kind `addressChanged` per booking ahead (waiting requests and
    confirmed visits not started, no waiting move: its booking hears it), in the same transaction
    (`queueAddressSms`), and keeps on each booking the address its client knew (`bookings.address_told`, set only when
    empty). Another save while a job waits moves its time on; a job a runner claimed is under way, so the save adds
    another.
  - The jobs word it when it goes (`sendAddressSms` in `jobs/run.ts`): the business row read `for share`, so a save
    under way finishes first; the address as it is, against `address_told`; the same, it settles unsent ("dropped: the
    client knows the address as it is"); sent, `address_told` becomes it (only if unchanged since the job read it).
    A home-based business's waiting request knows only its street, which is what it compares and tells.
  - Timing in `@yeral/domain/lifecycle`: `ADDRESS_SMS_AFTER_MS` (10 min), `addressSmsAt` (a visit sooner: 30 min
    before it, or at once), `newAddressSince` (the page's "New address" for `NEW_ADDRESS_DAYS`, 30).
  - It always goes, whatever the client's switches, like a decline. No SMS to past clients or favourites: the page
    says it. Text `sms.addressChanged` (en/tk/ru).
  - Contract: `movedAt` on the business page (30 days) and on a booking ahead made before the move (detail and link
    page).
- Tests: `settings/address.test.ts` (one SMS after the last fix, the waiting move, the cancelled booking, a move and
  back, a pin alone, a visit soon and one under way, the home-based street), domain unit tests.
- Follow-ups: a move and back within the 30 days still shows "New address" on the page (a concern in chapter 9); the
  address block's save should say how many clients will get the SMS (a **Design to fix** in B-37); the SMS caps of
  step 7 should count these too (a business moving back and forth sends one SMS per booking each time).
