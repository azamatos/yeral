# 2026-11-07 · Clients filters (design v0.7 · B5)

Branch `feat/clients-filters`. The owner's review (04.11, #31): «This filter the worst thing in the world… This whole
filtering and input, sorting should be reworked.» #321 rebuilt the table, #324 built `@yeral/ui/filter-bar`; this moves
the clients list onto it, from `docs/design/screens/business/B7-Clients.dc.html` (B5) and `CHANGELOG.md` v0.7 · 7.2.

## What's there

- **Api** (`GET /v1/w/{slug}/clients`): beside `q`, `segment`, `sort`, `dir` it takes `tag` (repeated for several,
  any of them, case-insensitive, at most `CLIENT_TAG_FILTER_MAX` = 20, each 1–20 letters) and `upcoming` (`yes`: a
  waiting request or a confirmed visit ahead, as the reader sees the bookings; `no`: neither). The response gains
  `upcoming: { yes, no }`, `tags: [{ name, count }]` (every tag on the clients the reader sees, under its most used
  spelling, the most held first, 0 kept) and `everyone` (the reader's clients with no filter: «24 of 100 clients»).
  Each menu counts under the other filters, not its own: `counts` (the chips) follow `q`, `tag`, `upcoming`; `upcoming`
  follows `q`, `segment`, `tag`; `tags` follow `q`, `segment`, `upcoming`. One facets query (`listFacets` in
  `modules/clients/facts.ts`, a CTE of one row per client with its flags) replaced `segmentCounts`. A specialist's scope
  is as before (her clients, her bookings). Tests in `clients.test.ts` → «by tag and Upcoming booking».
- **Sdk**: `clean()` sends a list as the key repeated (`tag=VIP&tag=Bride`) and drops an empty one; Hono's validator
  reads one value as a string, so the contract takes a string or a list and turns it into a list.
- **Page** (`pages/clients`): the segments as a `Segmented` M with counts above the FilterBar (as B5 draws it); the bar:
  search, Tag (multi, counts, search from 9 options), Upcoming booking (single, counts; the trigger reads «Upcoming
  booking · Yes», the chip «Has an upcoming booking»), the Sort menu (each sort in its own direction, Total only when
  the rows carry totals, the current reversed one added), chips, Clear all (keeps the segment), «N of M clients», the
  390 Filters sheet with «Show N results». The address stays the source: `?tag` (a string or the router's list),
  `?upcoming`; `?q&segment&sort&dir` unchanged. The page reads the address through `clientsSearch` itself too (the
  stories' router skips `validateSearch`).
- **`@yeral/ui` FilterBar**: `FilterDef.short` — a single filter's trigger words for the chosen option.

## Left for later

- B5's **Specialist** filter (owner/admin only, 20 people, search, counts): the api would filter by `hersSql(staffId)`
  and count per specialist.
- The Tag menu's **Automatic** group (New, Regular, Lapsed, Reported, Phone only next to the team's tags): the segments
  have their own row here, and Phone only isn't filterable yet.
- B5 draws the 390 segments as underline tabs; here the same `Segmented` scrolls sideways.
- «Any» in a single filter has no count (B5 shows «Any 100»): `FilterDef` has no meta for it.
- MultiSelect's trigger reads «Tag · 1» where B5 draws «Tag · Regular» for one tag.
- `seesTotal` still comes from the rows (no rows → no Total sort); a permission flag from the workspace would be exact.
