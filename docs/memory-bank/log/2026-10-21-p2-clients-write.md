# Keeping clients (feat/p2-clients-write)

- Changed: P2 step 4, book B-33, B-34 (notes, edit), B-35 (the switch), B-36, Q-208, F-141–F-144 (chapter 9 how-row,
  21.10.2026, Claude (delegated)). Stacked on the client list PR.
  - `clients/write.ts`: `addClient` (insert on conflict nothing; `client_exists` with `{ id, name }`; the first note),
    `updateClient` (the record locked; `client_phone_locked`; the name and number onto bookings ahead without an
    account; `setOnlineBlocked` for `phoneOnly`; a unique clash is `client_exists`), `addNote` (whoever sees the
    client, `clientFacts`), `deleteClient` (`client_has_bookings` with the bookings ahead; bookings keep the numbers,
    lose the record, name and number).
  - Routes `POST /w/{slug}/clients`, `PATCH`/`DELETE /w/{slug}/clients/{id}`, `POST …/{id}/notes`.
  - Contract `clientInputSchema`, `clientUpdateSchema`, `clientNoteInputSchema`, `clientTagsSchema`; errors
    `client_exists`, `client_phone_locked`, `client_has_bookings` (tk, ru, en); event `client.updated`.
  - sdk `clients.add/update/addNote/remove`; `client.updated` refreshes the clients, the calendar and requests.
- Tests: `clients/write.test.ts` (add with tags and the first note, a duplicate, a birthday ahead, a specialist 403;
  the edit onto bookings ahead only, another's number, the switches and clearing, an account's number locked; notes
  by a specialist on her own client, 404 on another, alert notes in the lookup; delete refused with both kinds,
  then the bookings without the name); sdk `client.updated`.
- Follow-ups: editing or deleting a note isn't drawn; bulk SMS and the clients export are after the MVP.
