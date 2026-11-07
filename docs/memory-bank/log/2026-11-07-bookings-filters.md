# 2026-11-07 · Bookings filters: several values, status, sort, «N of M» (B8, A5)

Branch `feat/bookings-filters`. Follows #324 (`log/2026-11-07-filter-bar.md`), the owner's 04.11 «our own filtering,
used everywhere».

## What changed
- **Api** `GET /v1/w/{slug}/bookings` (and `/export`): `staff`, `service`, `status`, `source` take several values,
  repeated or comma-separated (`staff=a,b`, `staff=a&staff=b`; one value as before); a list matches any of its values,
  filters add up. `status` matches as people see it now (a request that ran out is cancelled, an ended confirmed visit
  completed). `sort=soonest|latest|booked` (default by tab as before). The list sends `tabTotal` beside `total`: the
  tab's rows the reader sees without the filters. A specialist asking for anyone else's (even beside her own) gets 403.
  Shared helper `queryList(item, max)` in `@yeral/contract/common`; the sdk's `clean` joins arrays with commas.
- **Page**: Specialist and Service multi (Service grouped, searchable), Status multi with the tab's statuses (Today:
  pending, confirmed, completed, no-show; Upcoming: pending, confirmed; Past: completed, no-show; none on Cancelled),
  the SortMenu (Time soonest / latest, Booked newest), «N of M bookings» from `total`/`tabTotal`. Address: `staff`,
  `service`, `status` comma lists (old one-value links open), `sortBy` (the clients page owns `sort` with other values,
  and the router keeps one type per search key). Switching tabs clears the status.

## Left
- **Source** filter (Online, Phone, Walk-in): the api takes `source` already; the page needs Online → web, app, ai.
- **Requests tab's bar** (board B8: Specialist, Service, Date, Status, «Sort: Answer by»): `/requests` has no filters;
  its list is whole, so the page could filter it, or the api gains the same params.
- **Pick dates** in the Date filter.
- At 1440 with the sidebar, Export CSV wraps under the search: the bar's search field is wider than B8 draws it
  (`@yeral/ui/filter-bar` layout).
- Tab counts on Today / Upcoming (B8 draws «Upcoming 214»): `tabTotal` could feed them.
