# The client list, lookup and card (feat/p2-clients)

- Changed: P2 step 4, book B-32, B-34, B-23's lookup, F-124, F-139–F-141 (chapter 9 how-row, 21.10.2026, Claude
  (delegated)). Stacked on the complaints PR (it reads `complaint_by`).
  - `clients/facts.ts`: `clientFacts()` counts each client's visits (completed as seen now: `doneAt`), recent visits,
    first and last, total, no-shows, reports and the next booking (`aheadAt`) in one grouped query; a specialist's
    only theirs (`withStaff`, `having`); `segmentsOf()` (domain) turns the counts into the chips; `byRecent`,
    `phoneOnlyOf` (by hand or `blockedByCount`).
  - `GET /v1/w/{slug}/clients` (`clientList`): `q` (name, or digits anywhere in the national number), `segment`,
    cursor pages, `total`; sums only for `revenue: all`.
  - `GET /v1/w/{slug}/clients/lookup` (`clientLookup`): `phone` (from 3 national digits, the number's start) or
    `name` (from 2 letters); up to 3 with alert notes and usual services.
  - `GET /v1/w/{slug}/clients/{id}` (`clientCard`): `history` (10, up to 200) and `lang`; 404 for a client the reader
    can't see.
  - Requests: the client's `id` and `alerts`, visits as the card counts them (a specialist's own); the calendar's
    booking: the client's `id`.
  - sdk: `clients.list` (infinite), `clients.lookup`, `clients.card`; keys `clients(slug)` …; booking events and the
    team's booking changes refresh them.
- Tests: `clients/clients.test.ts` (order, search by digits and name, chips, pages, sums by level; a specialist's own
  clients, another's 404; the lookup's digits, exact number, name, both refused; the card's numbers, notes,
  upcoming and history with "show more", reports with who, the switches; requests and the calendar link the card);
  `clients.test.ts` (domain `segmentsOf`).
- Follow-ups: the writes come next (B-33 add, notes, edit, the phone-only and reminder switches, B-36 delete with
  bookings ahead refused); the list's search and chips are worked out in memory per request (fine for a business's
  few thousand clients; an index on `clients(business_id, name)` and SQL chips if a business grows past that).
