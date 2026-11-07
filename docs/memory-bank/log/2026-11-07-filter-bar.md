# 2026-11-07 · FilterBar (design v0.7 A5) and the bookings page on it (B8)

Branch `feat/filter-bar`. The owner's 04.11 problems #28, #31, #42: one filter bar for every list.

## What changed
- `@yeral/ui/filter-bar` (Storybook `Data/FilterBar`): `FilterBar` (search · filter menus · Sort · main action;
  row 2 with removable chips, Clear all and the result count while filtered or searched; under 768 the search on its
  own row, «Filters N» + count + Sort as an icon, the chips, and a Filters sheet: short filters inline, a long one
  drills into its own list with search, Back returns, «Show results»), `FilterButton` (single on `OptionList` with an
  «Anyone» row; multi = `MultiSelect`), `SortMenu`, `FilterChip`. Data-driven and fully controlled; `onClearAll` lets
  a page clear its address in one navigation. Strings come in `labels` (no strings in `@yeral/ui`).
- `MultiSelect`'s trigger keeps «Services · 3» in one text run (the row gap split it around the dot).
- Bookings: the toolbar is the FilterBar (Specialist, Service grouped with search, Date with Tomorrow added), the
  count («N bookings», «N shown» while more pages wait), Export CSV as the action. Old links (`staff`, `service`,
  `when=today|week`) still open. Requests: «Answer by» (timer) and «Answer» (✓ tint, ✕ outline) columns, one line each.

## Left (not in this PR)
- Specialist and Service stay **single**: the api's `bookingFiltersSchema` takes one `staff` and one `service`. Multi
  needs an api change (arrays in the query, the repository's `IN`).
- No Status or Source filter and no Sort on bookings: the api has neither (the tabs split by status). «Pick dates» not
  built. The Requests tab has no bar yet (its list is unfiltered on the api).
- The count is of loaded rows: the list api sends no total, so «24 of 214» can't be drawn yet.
- Segmented with counts (A5's segments) and the phone Sort sheet's own title are as `SelectLayer` draws them.
- The other lists (Calendar, Clients, Reviews, client Search, Venue services) move onto the bar in their own PRs.
