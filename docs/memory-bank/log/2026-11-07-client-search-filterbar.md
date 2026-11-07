# 2026-11-07 · The client's search results on the FilterBar (design v0.7 · A5, C1 results toolbar)

Branch `feat/client-search-filterbar`. Round 7's "FilterBar on the client site's search" (C7-Home C4 · results toolbar,
DS-Lists A5). The category pages share the page, so they got it too.

## What changed

- **`pages/search/ui/results-toolbar.tsx`** — the drawn toolbar on `@yeral/ui` `FilterBar`: row 1 Distance (single,
  Within 1 · 3 · 5 · 10 · 25 km, 5 km the plain default; off with «Turn on location to filter by distance» without a
  position) · Rating (Any rating · 4.5+ · 4.0+) · Price (Any price · Up to 100 TMT · 100–200 TMT · 200 TMT and up, the
  currency from `fmt.money`) · Sort: Recommended (Recommended · Nearest with a position · Price, lowest first); row 2 the
  active chips («Rating: 4.5+»), Clear all and the count, always shown. Under 768 «Filters · N», the count, Sort as an
  icon and the Filters sheet (radio rows per filter, Distance's reason as a line, «Show N places»). Every value is in
  the address as before (`r`, `rating`, `from`, `to`, `sort`); a choice applies at once; a rating, range or sort from an
  older link that the menus don't offer stays in its menu, read as it is («Price · 50 TMT and up»). Clear all and the
  empty state's «Clear filters» reset the same keys (`CLEARED`: rating, price, radius, map area) in one navigation.
- **The page** — the day Segmented (now L, with the What / Where fields and the category chips: "the day is part of the
  search", not the toolbar); the heading, then the toolbar; the count under the heading moved to row 2 (same copy, so
  `e2e/tests/discovery.spec.ts` reads it unchanged). A calendar day from Home's When (`date`) now reads "free time on
  Thu, 12 Nov" (`dayOf`), shows no day of the toggle, and Today / Tomorrow / This week clear it (the home-search gap).
- **Removed:** the Filters drawer (price fields, Open now, Women only), the «Filters · N» and «Rating 4.5+» chips, the
  How-far and sort selects.
- **Open now and Women only kept: book C-03 wins on behaviour** (AGENTS.md; the C7 board doesn't draw them). Two more
  single FilterButtons after Price, on the clients list's «Upcoming booking · Yes» pattern: an «any» row («Open or
  closed», «Everyone») and one option, «Open now · Yes» while on, a plain chip («Open now»), two radio rows each in the
  phone sheet; the address keys `open` and `women` as before, so older links keep working (`openNow`, `womenOnly` to
  the api); Clear all and «Clear filters» reset them with the rest. Row 1 now wraps inside the list column (Sort drops
  to a second line under ~800 px of column), as FilterBar wraps; no new layout.
- **`@yeral/ui` FilterBar** (generic, stories `DisabledHint`, `PlainDefault`, `SearchedElsewhere`): `disabledHint` (a
  single filter off with a reason: the button stays focusable with a tooltip, `aria-disabled`; the sheet shows the line
  instead of the options), `plain` on a single filter (the option that means nothing is filtered: checked by default,
  the trigger plain, no chip, no «Anyone» row, picking it gives null), `searched` on the bar (the query lives outside
  the bar — a header query — so row 2 shows the count with nothing chosen).
- Stories `Client/Pages/Search`: Results (the toolbar at rest), CalendarDay, Filters, OlderRange, Sort, LocationOff,
  NothingFound and NearAPosition on the menus, Phone, PhoneFilters.

## Decisions

- **Drawn ∩ api:** Distance, Rating, Price and Sort are drawn and in `searchQuerySchema`. Open now and Women only are in
  the api and the book (C-03) but not on the C7 board: first left out as undrawn, then kept (the book wins on behaviour,
  the screen on visuals), on the nearest drawn pattern, at the cost of row 1 wrapping.
- **Recommended** = the api's own order (nearest with a position, rating × reviews without). The board's "free times on
  the chosen day first" isn't an api order. **Earliest time** isn't in the api either, so it isn't offered. A `sort=rating`
  link keeps working (the option appears while it's the value).
- **No counts in the menus or chips:** the api gives no per-option counts; the board's "4 · 13 · 24" column waits for them.
- The toolbar is composed in the page (`pages/search/ui`), as the business lists do, not the `widgets/search-results`
  of COMPONENTS.md: the address model is the page's.

## Left

- The **compact header SearchBar** on Search / Venue (C1: 600 × 48, r 999, the round ink button; the 390 summary field
  that opens the SearchSheet) isn't built: the page keeps its What / Where fields and the day Segmented in the search
  block until it is. Then the Segmented and the on-page fields go, as the board draws.
- The result cards' StatusPill, service line and TimeSlots S (C4's VenueResultRow extension), the no-results page with
  «Search further away», `tod` as a filter (no api), tk/ru strings.
