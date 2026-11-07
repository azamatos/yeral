# 2026-11-07 · Home search (design v0.7 · C1)

Branch `feat/home-search`, agent in the shared worktree. The owner's "main pain" (#43, #48): the home page's first block.

## Done

- **`widgets/search-bar`** — the C7-Home SearchBar at ≥ 768: What · Where · When as one raised bar (`shadow-bar`, r 16),
  the focused segment a white pill, the bar behind it n-50; the Search button Primary L. Panels 8 px under the bar,
  never over the button: What = the categories as chips (nothing typed) or Categories · Services · Businesses from
  `sdk.catalog.suggest` (up to 3 each, the typed part in 600, «Show all results for “…”», skeletons while loading,
  «Nothing matches»); Where = Near me (spins until the browser answers), the cities, the api's places from 2 letters,
  the location-off Info callout with «How to allow» (the pick-place help modal, now `LocationHelp`); When = quick
  chips (Any time · Today · Tomorrow · This week), the `@yeral/ui` Calendar (Monday first, today ringed, past days off),
  Time of day chips, Clear · summary · Done. ↑ ↓ Enter Esc on What and Where (`model/use-listbox`), combobox roles,
  Esc from When goes back to its button, Done moves the focus to Search. Submitting goes to `/search` with
  `what`, `near` / `city`, `day`, and two new address keys `date` (a calendar day; `apiSearch` sends it) and `tod`.
- **`SearchCard` + `SearchSheet`** under 768: the card's three rows + Search; a row opens the full-screen sheet with the
  three L fields on top, the active field's rows below (48 / 64), When with a full-width month and a 2-column time of
  day, the footer «Show N places» counting live (300 ms) + Clear on When. A pick fills its field and moves to the next.
- `CategoryIcon` moved to `entities/category`; `askBrowser` resolves to whether a position came; home's old
  `what / where / when / today / tomorrow / week / submit` keys replaced by the `searchBar` namespace.
- Stories `Client/Search/SearchBar` (Rest, WhatOpen, WhatTyping, NothingFound, WhereOpen, LocationOff, WhenOpen,
  Phone) and Home's stories updated. Screenshots (1440 and 390) in the PR.

## Gaps and deviations (for the lead / the owner)

- The api's suggest gives services as names only (no place counts) and businesses without photo, distance or rating:
  the rows show an initial tile and the category. Where has no districts / streets groups: one «Places» group.
- The api has no time-of-day filter: `tod` rides in the address and the bar shows it, the results don't filter by it.
  «This weekend» isn't an api notion either: the chip is «This week» (`day=week`).
- The sheet's top bar uses `ModalHeader` (an × at the right) instead of the drawn «‹ Back» at the left.
- Recent searches on What (local storage) not built.
- The search page still shows its Today / Tomorrow / This week segmented and the old What / Where fields; a
  calendar `date` lands there as "today" in the count copy until the results toolbar (C4, step 4) moves the day into a
  compact SearchBar. The no-results page with «Search further away» (C1) is also left.

## Checks

`pnpm turbo run lint typecheck test --filter=@yeral/client... --filter=@yeral/ui...` green except `@yeral/api#test`
(needs Postgres; CI runs it). Story files run: `search-bar.stories`, `home-page.stories`, `site-layout.stories`.
