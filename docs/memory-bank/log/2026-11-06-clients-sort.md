# 2026-11-06 — the clients list sorts, counts its chips, the card totals (W1-5)

Branch `feat/clients-sort`: the owner's #11 and #31 (`review-a.md`, `review-b.md`; plan `2026-11-06-owner-review-plan.md`
→ W1-5). The api, the contract and the sdk give the business clients list the data the v0.7 FilterBar and table (A5,
A6) will show; the list UI itself comes with the table redesign (W2-6).

## What's there

- **`GET /v1/w/{slug}/clients?sort&dir`** (`packages/contract/src/clients.ts` → `CLIENT_SORTS`, `SORT_DIRS`,
  `CLIENT_SORT_DIR`): `sort` = `recent` (the default, today's order: the latest booking's day, ahead or past, else the
  day the business added them) · `name` · `visits` · `lastVisit` · `total` · `nextBooking`; `dir` = `asc` | `desc`,
  each sort's own direction without it (`recent`, `visits`, `lastVisit`, `total` newest or biggest first; `name` A→Z;
  `nextBooking` soonest first). A client without the thing (no visit, no booking ahead, no name) comes last either
  way (`nulls last`); ties by id, so the offset pages (`cursor`) never repeat or skip a client. `total` sorts as `recent`
  for a reader without "See revenue" (they get no totals, so no order by them either); a specialist's rows and
  counts stay her own (`hersSql`, `withStaff`), whatever the sort.
- **`counts`** on every page of the list answer: `{ all, regular, new, lapsed, flagged }` for the current `q` and the
  reader's scope, whatever chip is on — `segmentCounts` in `facts.ts`, one grouped query (the chip flags as a subquery,
  `count(*) filter`), run beside the page in `all()`.
- **The card:** `stats.total` (what the completed visits cost; null without "See revenue") and `historyCount` (how
  many past bookings the history holds; `history` shows the newest `history` of them). The card's UI (`client-stats.tsx`)
  doesn't show them yet: the v0.7 `FactList` (A7) decides where they go.
- **`facts.ts`:** `factsOf()` builds the per-client pieces once (columns, join, where, `visible`, chip flags, sort
  keys); `clientFacts` and `segmentCounts` compose their own select from them. The next-booking key is
  `min(lower(bookings.span)) filter (where ahead)`, the same minute scale as the spans.
- **The business page:** `?sort&dir` ride in the address (`pages/clients/model/search.ts`, state rule 2) and go to
  `sdk.clients.list`; nothing in the UI sets them yet: `TableColumnHeader` has no sort prop (the sortable header is
  A6), and the chips don't show the counts (A5). Typing `?sort=visits` in the address works today.
- **Tests:** `clients.test.ts` → "sorted, counted and paged": five clients of its own (`+9936591000x`, `q=659100`):
  every sort both ways, ties and nulls, the second and third page of each, the counts with and without `q` and with a
  chip on, the specialist's and the administrator's view, the card's new fields; 400 for an unknown sort or direction.
  `search.test.ts` for the address.

## Checked, not changed

- **No index.** `EXPLAIN ANALYZE` on a seeded database with Glow Studio at 5,020 clients and 25,100 bookings: every
  sort is an `ORDER BY` on an aggregate over the same per-client `GroupAggregate` today's `recent` order runs
  (`clients` by its business index, `bookings` by `bookings_client_idx`), 14–36 ms a page as the owner; the counts
  query 17 ms. The specialist's path (`booking_items_staff_date_idx`, then a semi join over `bookings`) is unchanged
  from before; it was checked with the seed's items only (the bench items collided with the seed's active slots).
  Nothing an index would help: the sort key is computed per client.
- `clientLookup` keeps the `recent` order; «Frequent clients» on the new booking's name search can now ask
  `clientFacts(…, { sort: 'visits' })` (activeContext "Next steps 3").

## Left

- The list UI: sortable headers with `aria-sort` (A6), the FilterBar with the chips' counts and a sort menu (A5),
  the card's Visits total and History count in the `FactList` (A7) — W2-6, after design round 7.
- The counts run on every page; if a long list ever matters, send them on the first page only (`cursor` absent).
