# Price range filter (feat/p2-3-price-range)

- Changed: P2 step 3 (book C-03, F-011). `GET /v1/search` takes `minPrice` next to `maxPrice`. `priceWithin()`
  (`catalog/search.ts`) filters in the query, before cards are built, with one aggregate over the place's services:
  one paid online service (`fixed` or `from`, by its amount) inside the range, or every shown online service free
  for a range from 0; tables never match (they show no price). Query prices stop at the 32-bit limit (400 above). It replaces the cards' `maxPrice` filter from the average bill PR, with the same answer for `maxPrice` alone.
  The "how" is a 20.10.2026 row in chapter 9.
- Known: a card shows its lowest price, so with `minPrice` it can read "from 40" when a dearer service is inside the
  range. `minPrice` above `maxPrice` is a 400 (`priceRange`, beside `latWithLng`);
  a place with a free service and paid ones from 100 doesn't match "up to 50", as its card reads "from 100".
- Follow-ups: the client app's filters drawer (P4) sends both; the specialist-gender filter stays Later (F-012).
