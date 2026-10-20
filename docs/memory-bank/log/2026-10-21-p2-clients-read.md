# The client list, lookup and card (feat/p2-clients)

- Changed: P2 step 4, book B-32, B-34, B-23's lookup, F-124, F-139–F-141 (chapter 9 how-row, 21.10.2026, Claude
  (delegated)). Stacked on the complaints PR (it reads `complaint_by`).
  - `clients/facts.ts`: `clientFacts()` counts each client's visits (completed as seen now: `doneAt`), priced and
    recent visits, first and last, total, no-shows, reports and the next booking (`aheadAt`) in one grouped query,
    with the chip (`having`), the order, the page and the count (`count(*) over ()`) in SQL; a specialist's only
    theirs (`withStaff`; visible with a booking or a waiting move onto them); `scope: 'business'` counts every
    booking; `segmentsOf()` (domain, its limits shared) names the chips; `avgCheckOf`, `phoneOnlyOf` (by hand or
    `blockedByCount`, and which by count), `alertNotesOf` (the calendar and requests use it too); `ownOnly` refuses a
    level without the clients row.
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
- Review (15; 14 fixed, 1 kept): the drawer found only a specialist's own clients (now any by the whole number);
  a waiting move onto a specialist didn't open its client's card (now visible); the request drawer showed a
  specialist only her own no-shows (now the business's); usual services offered archived ones; the digit search
  stripped a leading 8 or 993; settings and answering requests didn't refresh the clients; `ownOnly` failed open;
  the list aggregated every client and sorted in memory (now SQL, the lookup too); duplicated alert-note queries and
  counts (now `alertNotesOf`, `clientFacts`); the name lookup matched inside words (now word starts); the card's
  phone-only had its own path (now `phoneOnlyOf`); the average check counted unpriced visits; the sdk's lookup
  counted raw digits (now `lookupReady`, shared limits); the list also carries `avgCheck` (the design's column).
  Kept: the card reads its bookings besides the totals (the totals stay the list's, one definition).
- Follow-ups: the writes come next (B-33 add, notes, edit, the phone-only and reminder switches, B-36 delete with
  bookings ahead refused); the list's search and chips are worked out in memory per request (fine for a business's
  few thousand clients; an index on `clients(business_id, name)` and SQL chips if a business grows past that).
